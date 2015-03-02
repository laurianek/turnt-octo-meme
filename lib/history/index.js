/**
 * Created by lauriane1 on 02/03/15.
 */
'use strict';

//requires
var request = require('request');
var browserEnv = require('jsdom').env;

//module variables
var historySitePartial = 'http://www.euro-millions.com/results-archive-';

request(historySitePartial + '2004', function (error, response, body) {

  //If an error occur throw error for now
  if (error) {
    throw error
  }

  if (response.statusCode == 200) {
    //replace all new lines and tabs
    // /* debug */ console.log(body);
    body = body.replace(/[\t\r\n]/gm,'');


    // create a browser environment
    browserEnv(body, function browserEnvFn(errors, window) {
      console.log(errors);

      // import jquery
      var $ = require('jquery')(window);

      // get all the draw results
      var $draws = $('ul.balls'),
        draws = [];

      $draws.each(function eachDrawFn(index){
        var $this = $( this );

        // get the date of the draw
        var drawDate = $this.prev('a').attr('href').replace('/results/','');

        //transform date string into date object
        var dateParts = drawDate.split('-');
        drawDate = new Date(dateParts[2], parseInt(dateParts[1])-1, dateParts[0]);
        // /* debug */ console.log(drawDate, dateParts);

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

        // /* debug */ console.log(mainNumbers,luckyStars);
      });

      console.log(draws);
    });

  }
});