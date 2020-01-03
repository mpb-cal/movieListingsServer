const moment = require( 'moment' )
const _ = require( 'underscore' )

const LISTINGS_FILE = __dirname + '/../getListings/theaterData/listings.json'

var fs = require( 'fs' )
var express = require('express')
var router = express.Router()

/*
function isValidDate( date )
{
  return /^\d\d\d\d-\d\d-\d\d$/.test( date )
}
*/

router.get('/', function(req, res) {
  let movieDate// = req.session.movieDate
  //if (!isValidDate( movieDate )) {
    movieDate = moment().format().slice( 0, 10 )
  //}

  let text = fs.readFileSync( LISTINGS_FILE, 'utf8' )
  let movieData = JSON.parse(text)
  movieData.shift()

  let availableDates = _.pluck( movieData, 0 )
  availableDates = _.uniq( availableDates )
  availableDates = availableDates.sort()
  // remove dates before today
  availableDates = availableDates.filter(
    date => new Date( moment( date ).format() ).valueOf() >= new Date( movieDate ).valueOf()
  )

  //movieData = movieData.filter( e => e[0] == movieDate )

  res.render('index', {
    $movieData: movieData,
    $movieDate: movieDate,
    $availableDates: availableDates,
    $flashError: req.flash( 'error' ),
    $flashInfo: req.flash( 'info' ),
  })
})

/*
router.post('/', function(req, res) {
  req.session.movieDate = req.body.movieDate
  if (isValidDate( req.body.movieDate )) {
    req.flash( 'info', 'Date set to ' + req.body.movieDate )
  } else {
    req.flash( 'error', req.body.movieDate + ' is not a valid date' )
  }

  res.redirect( '/' )
})
*/

module.exports = router
