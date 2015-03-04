/**
 * Created by lauriane1 on 04/03/15.
 */
'use strict';

//requires
var mysql = require('mysql');

// database connection object
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'euromillions'
});

/*
  Query for checking euromillions history doesn't have
  2 or more winner main numbers that have been drawn before

 SELECT dn.draw_id, GROUP_CONCAT(dn.number ORDER BY dn.number) AS numbers
 FROM euromillions.draw_number AS dn
 WHERE dn.is_lucky_star = 0
 GROUP BY dn.draw_id
 HAVING numbers IN (
 SELECT GROUP_CONCAT(number ORDER BY number)
 FROM euromillions.draw_number
 WHERE draw_id <> dn.draw_id
 AND is_lucky_star = 0
 GROUP BY draw_id
 )
 ORDER BY numbers;
 */

function checkHistoryForDup() {
  //connect to db
  //run query
  //close connection
  //return a result
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


//Database utilities

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

  //insert into database
  
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