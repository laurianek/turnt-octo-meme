/**
 * Created by lauriane1 on 02/03/15.
 */
'use strict';

//requires
var request = require('request');
var browserEnv = require('jsdom').env;
var Q = require('q');
var fs = require('fs');


// module exports
module.exports = {};

//module variables
var historySitePartial = 'http://www.euro-millions.com/results-archive-';



function processAllDrawHistory(){
  var firstYear = 2004;
  var thisYear =(new Date).getFullYear();
  var allDrawHistory = {};

  // extract draws by year
  for (var year = firstYear; year <= thisYear; year++){

    getDrawHistory(year);
    console.log(year);
  }
return;

};

processAllDrawHistory();

/**
 * Get the draws history of that year
 *
 * @param year
 * @returns {Object} promise object with draws history array
 */
function getDrawHistory(year){
  request(historySitePartial + year, function (error, response, body) {

    //If an error occur throw error for now
    if (error) {
      throw error;
    }

    if (response.statusCode == 200) {

      //replace all new lines and tabs
      body = body.replace(/[\t\r\n]/gm,'');

      var draws;
      getDraws(body).then(function (drawsData){
        draws = drawsData;

        var fileName =  year + '.json';
        var fullFileName = __dirname + '/' + fileName;

        //check if file name exist
        fs.exists(fullFileName, function (exists) {
           if(!exists) {
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
}

/**
 * Get the draws out of the html string passed
 *
 * @param html
 * @returns {Object} promise object with draws history array
 */
function getDraws(html){
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

    $draws.each(function eachDrawFn(){
      var $this = $( this );

      // get the date of the draw
      var drawDate = $this.prev('a').attr('href').replace('/results/','');

      //transform date string into date object
      var dateParts = drawDate.split('-');
      drawDate = new Date(dateParts[2], parseInt(dateParts[1])-1, dateParts[0]);

      // /*debug*/ console.log(drawDate, dateParts);

      // get the each of the main balls and the lucky stars
      var mainNumbers = [], luckyStars = [];
      $this.children('.ball').each(function eachBallFn(){
        mainNumbers.push(parseInt(this.innerHTML));
      });
      $this.children('.lucky-star').each(function eachBallFn(){
        luckyStars.push(parseInt(this.innerHTML));
      });

      //add draw to draws array
      draws.push({date: drawDate, mains: mainNumbers, stars: luckyStars})

      // /*debug*/ console.log(mainNumbers,luckyStars);
    });

    // /*debug*/console.log(draws);

    // resolve promise
    deffered.resolve(draws);

    // free memory associated with the window
    window.close();
  });

  return deffered.promise;
}