const moment = require( 'moment' )
const _ = require( 'underscore' )

const LISTINGS_FILE = __dirname + '/../getListings/theaterData/listings.json'

var fs = require( 'fs' )
var express = require('express')
var router = express.Router()

router.get('/', function(req, res) {
  let movieDate = moment().format().slice( 0, 10 )

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

  res.render('index', {
    $movieData: movieData,
    $movieDate: movieDate,
    $availableDates: availableDates,
  })
})

module.exports = router
