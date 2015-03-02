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
    //console.log(body);
    body = body.replace(/[\t\r\n]/gm,'');


    // create a browser environment
    browserEnv(body, function browserEnvFn(errors, window) {
      console.log(errors);

      // import jquery
      var $ = require('jquery')(window);

      // get all the draw results
      var draws = $('ul.balls');

      draws.each(function eachDrawFn(index){


        console.log( index + ": " + $( this ).html() );
      });

      return;
    });

  }
});