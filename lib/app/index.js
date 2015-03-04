/**
 * Created by lauriane1 on 04/03/15.
 */
'use strict';

//requires
var mysql = require('mysql');
var Q = require('q');

// database connection object
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'euromillions'
});

// module execution
(function moduleExe(){
  var promises = [];

  //connect to db
  connectToDb();

  var promise01 = checkHistoryForDup();
  promises.push(promise01);

  var promise02 = checkNumbersAgainstHistory();
  promises.push(promise02);

  //check all promises and end db connection
  bindPromisesCallBacks(promises);
})();



/**
 * Check euromillions history for duplicate main draw numbers
 */
function checkHistoryForDup() {
  var deferred = Q.defer();
  //run query
  connection.query(
    'SELECT dn.draw_id, GROUP_CONCAT(dn.number ORDER BY dn.number) AS numbers ' +
      'FROM draw_number AS dn ' +
      'WHERE dn.is_lucky_star = 0 ' +
      'GROUP BY dn.draw_id ' +
      'HAVING numbers IN ( ' +
      'SELECT GROUP_CONCAT(number ORDER BY number) ' +
      'FROM draw_number ' +
      'WHERE draw_id <> dn.draw_id ' +
      'AND is_lucky_star = 0 ' +
      'GROUP BY draw_id ' +
      ') '+
      'ORDER BY numbers;'
    ,
    function(err, result) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }

      //output a result
      if (result.length === 0){
        //console.log('\nNO duplicate main number combination in whole history of euromillions\n');
      } else {
        console.log('\nThere are duplicate in the history of euromillions',result);
      }

      deferred.resolve();
    }
  );

  return deferred.promise;
}

/*
  Query for checking 5 numbers have not been drawn before against the db.
 SELECT d.date, count(dn.id) as cnt
 FROM euromillions.draw_number AS dn
 JOIN euromillions.draw AS d ON dn.draw_id = d.id
 WHERE dn.is_lucky_star = 0
 AND dn.number IN (10, 29, 32, 36, 41)
 GROUP BY d.date
 HAVING cnt = 5;
 */

function checkNumbersAgainstHistory(){
  var deferred = Q.defer();

  //get user input
  var input = process.argv[3];

  //check whether user wants to check multiple sets of numbers or just on set of numbers
  //query the database for that set of numbers
  connection.query(
    'SELECT d.date, count(dn.id) as cnt ' +
    'FROM euromillions.draw_number AS dn ' +
    'JOIN euromillions.draw AS d ON dn.draw_id = d.id '+
    ' WHERE dn.is_lucky_star = 0 ' +
    ' AND dn.number IN ?? ' +
    ' GROUP BY d.date '+
    ' HAVING cnt = 5;'
    ,
    [7,8,24,25,47]
    ,
    function(err, result) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }

      //output result
      console.log(result);

      //resolve deferred object
      deferred.resolve();
    }
  );



  return deferred.promise;
}



/**
 * Connect to database
 */
function connectToDb() {
  connection.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('connected as id ' + connection.threadId);
  });
}



/**
 * End connection to database
 */
function disconnectToDb() {
  connection.end(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('ended database connection as id ' + connection.threadId);
  });
}



/**
 * Insert a record into the the database
 *
 * @param drawDate must be a Date object
 * @param mains must be an array of 5 integers
 * @param stars must be an array of 2 integers
 */
function insertLatestDraw(drawDate, mains, stars) {

  validateInsertData(drawDate, mains, stars);

  //connect to database
  connectToDb();

  //insert into database
  connection.query('INSERT INTO draw SET ?', {date: drawDate}, function(err, result) {
    if (err) {
      console.error('error inserting row: ' + err.stack);
      return;
    }

    // get the draw id
    var drawId = result.insertId;
    console.log('> inserted into table draw id ' + drawId);

    //insert drawn ball into database
    var mainsPromises = insertIntoDrawNumber(mains, drawId, 0);
    var starsPromises = insertIntoDrawNumber(stars, drawId, 1);
    var allPromises = mainsPromises.concat(starsPromises);

    //close the database connection when all promises are fulfilled
    bindPromisesCallBacks(allPromises);

  });
}



/**
 * Loop through drawNumbers array and insert draw number into database
 *
 * @param drawNumbers array or number to insert into database
 * @param drawId
 * @param is_lucky_star
 * @returns {Array} array of promises
 */
function insertIntoDrawNumber(drawNumbers, drawId, is_lucky_star) {
  //returned array of promises
  var promises = [];

  for (var i = 0, drawData, deferred; i < drawNumbers.length; i++) {
    drawData = {
      draw_id: drawId,
      number:drawNumbers[i],
      is_lucky_star: is_lucky_star
    };

    // create a deferred object to resolve with data has been inserted
    deferred = Q.defer();

    // Push promise into array of promises
    promises.push(deferred.promise);

    // wrap connection in function call to isolate it from changes to during async calls
    (function (drawData, deferred){
      //save to db
      connection.query('INSERT INTO draw_number SET ?', drawData, function(err, result) {
        if (err) {
          console.error('error inserting row: ' + err.stack);
          return;
        }

        console.log('> inserted into table draw_number id ' + result.insertId);

        //resolve deferred object
        deferred.resolve();
      });
    })(drawData, deferred);
  }

  return promises;
}



/**
 * Binds the promises success callback function
 *
 * @param promises
 */
function bindPromisesCallBacks(promises) {
  var areAllPromisesFulfilled;
  for (var i = 0, promise; i < promises.length; i++){
    promise = promises[i];
    promise.then(function() {
      areAllPromisesFulfilled = checkAllPromises(promises);

      // if all the promises are fulfilled then close db connection
      if(areAllPromisesFulfilled) {
        disconnectToDb();
      }
    });
  }
}



/**
 * check if all promises in the array are fulfilled
 *
 * @param promises
 * @returns {boolean}
 */
function checkAllPromises(promises) {
  for (var i = 0, promise; i < promises.length; i++){
    promise = promises[i];
    if(!promise.isFulfilled()){
      return false;
    }
  }
  return true;
}


/**
 * Throws error if data is not valid
 *
 * @param drawDate
 * @param mains
 * @param stars
 */
function validateInsertData(drawDate, mains, stars){
  var check;

  //check if drawdate is a date
  if (!(drawDate instanceof Date)) {
    throw new Error('Date must be a date object');
  }

  //check if mains length is 5
  if (mains.length !== 5) {
    throw new Error('Main numbers needs 5 integers between 1 and 50')
  }

  //check if mains are all integers
  check = checkIntegerArray(mains, 1, 50);
  if (!check) {
    throw new Error('Main numbers needs to all be integers between 1 and 50')
  }

  //check if stars length is 2
  if (stars.length !== 2) {
    throw new Error('Lucky stars numbers needs 2 integers between 1 and 11')
  }

  //check if stars are all integers
  check = checkIntegerArray(stars, 1, 11);
  if (!check) {
    throw new Error('Lucky stars numbers needs to all be integers between 1 and 11')
  }
}



/**
 * Check if array contains integers only within the min and max bounds
 *
 * @param intArray
 * @param min
 * @param max
 * @returns {boolean}
 */
function checkIntegerArray(intArray, min, max) {
  for (var i = 0, number; i < intArray.length; i++) {
    number = intArray[i];
    if (Math.floor(number) !== number || number > max || number < min) {
      return false;
    }
  }
  return true;
}