/**
 * Created by lauriane1 on 02/03/15.
 *
 * This file is not production complete but has done its job,
 * I've got the JSON of the all the euromillions history and
 * have it in a mysql db as well.
 */
'use strict';

//requires
var request = require('request');
var browserEnv = require('jsdom').env;
var Q = require('q');
var fs = require('fs');
var mysql = require('mysql');

// database connection object
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'euromillions'
});

// connect to database
connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + connection.threadId);
});


// module exports
module.exports = {};

//module variables
var historySitePartial = 'http://www.euro-millions.com/results-archive-';

// module executing function;
processAllDrawHistory();

/**
 *
 */
function processAllDrawHistory() {
  var firstYear = 2004,
    thisYear =(new Date).getFullYear(),
    forceSave = false;

  // extract draws by year
  for (var year = firstYear; year <= thisYear; year++) {
    forceSave = year == thisYear;
    getDrawHistory(year, forceSave).then( function(drawsData) {
      saveToDB(drawsData);
    });
  }
}


/**
 * Save the year draws into database
 *
 * @param yearDraws
 */
function saveToDB(yearDraws) {
  var drawNumberData, promises = [], promise;

  for (var i = 0; i < yearDraws.length; i++) {

    // wrap connection in function call to isolate it from changes to during async calls
    (function (draw){
      var drawId;
      // save to database
      connection.query('INSERT INTO draw SET ?', {date: draw.date}, function(err, result) {
        if (err) {
          console.error('error inserting row: ' + err.stack);
          throw err;
        }

        // get the draw id
        drawId = result.insertId;
        console.log('> inserted into table draw id ' + drawId);

        //insert drawn ball into database
        insertIntoDrawNumber(draw.mains, drawId, 0);

        insertIntoDrawNumber(draw.stars, drawId, 1);

      });
    })(yearDraws[i]);

  }
}



/**
 * Loop through drawNumbers array and insert draw number into database
 *
 * @param drawNumbers array or number to insert into database
 * @param drawId
 * @param is_lucky_star
 * @return promise object when all processing is done
 */
function insertIntoDrawNumber(drawNumbers, drawId, is_lucky_star) {
  //deferred object
  var deferred = Q.defer(),
    drawData;

  for (var i = 0; i < drawNumbers.length; i++) {
    drawData = {
      draw_id: drawId,
      number:drawNumbers[i],
      is_lucky_star: is_lucky_star
    };

    // wrap connection in function call to isolate it from changes to during async calls
    (function (drawData){
      //save to db
      connection.query('INSERT INTO draw_number SET ?', drawData, function(err, result) {
        if (err) {
          console.error('error inserting row: ' + err.stack);
          throw err;
        }

        console.log('> inserted into table draw_number id ' + result.insertId);

        // resolve promise
        deferred.resolve();
      });
    })(drawData);
  }

  // return promise
  return deferred.promise;
}


/**
 * Get the draws history of that year
 *
 * @param year
 * @returns {Object} promise object with draws history array
 */
function getDrawHistory(year, forceSave) {
  // returned deferred object
  var deferred = Q.defer();

  request(historySitePartial + year, function (error, response, body) {

    //If an error occur throw error for now
    if (error) {
      throw error;
    }

    if (response.statusCode == 200) {

      //replace all new lines and tabs
      body = body.replace(/[\t\r\n]/gm,'');

      getDraws(body).then(function (drawsData) {
        //resolve promise
        deferred.resolve(drawsData);

        //save file if not done
        var fileName =  year + '.json';
        var fullFileName = __dirname + '/' + fileName;

        //check if file name exist
        fs.exists(fullFileName, function (exists) {
           if(!exists || forceSave) {
             // write data to JSON file
             fs.createWriteStream(__dirname + '/' + fileName)
               .write(JSON.stringify(drawsData), function finishedWriteCallback(){
                 console.log('finished writing ./' + fileName);
               });
           } else {
             console.log('./' + fileName + 'already exist');
           }
        });

      });
    }
  });

  //return promise
  return deferred.promise;
}



/**
 * Get the draws out of the html string passed
 *
 * @param html
 * @returns {Object} promise object with draws history array
 */
function getDraws(html) {
  // promise object returned
  var deffered = Q.defer();

  // draws array to return within the promise
  var draws = [];

  // create a browser environment
  browserEnv(html, function browserEnvFn(errors, window) {
    console.log(errors);

    // import jquery
    var $ = require('jquery')(window);

    // get all the draw results
    var $draws = $('ul.balls');

    $draws.each(function eachDrawFn() {
      var $this = $( this );

      // get the date of the draw
      var drawDate = $this.prev('a').attr('href').replace('/results/','');

      //transform date string into date object
      var dateParts = drawDate.split('-');
      drawDate = new Date(dateParts[2], parseInt(dateParts[1])-1, dateParts[0]);

      // get the each of the main balls and the lucky stars
      var mainNumbers = [], luckyStars = [];
      $this.children('.ball').each(function eachBallFn() {
        mainNumbers.push(parseInt(this.innerHTML));
      });
      $this.children('.lucky-star').each(function eachBallFn() {
        luckyStars.push(parseInt(this.innerHTML));
      });

      //add draw to draws array
      draws.push({date: drawDate, mains: mainNumbers, stars: luckyStars});
    });

    // resolve promise
    deffered.resolve(draws);

    // free memory associated with the window
    window.close();
  });

  return deffered.promise;
}