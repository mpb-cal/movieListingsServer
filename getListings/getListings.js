'use strict';

(function () {
  const path = require( 'path' )
  const fs = require( 'fs' )
  const http = require( 'http' )
  const https = require( 'https' )
  const async = require( 'async' )
  const moment = require( 'moment' )
  const csv = require( 'csv-string' )
  const pad = require( 'pad' )
  const jsdom = require( 'jsdom' )
  const jquery = require( 'jquery' )
  const program = require('commander')
  const { JSDOM } = jsdom

  program
    .version('0.1.0')
    .option('-f, --force-new-data', 'Ignore cache and download new theater data')
    .parse(process.argv)

  const HTML_DIR = path.join( __dirname, 'theaterPages' )
  const LISTINGS_DIR = path.join( __dirname, 'theaterData' )
  const LISTINGS_JSON = path.join( LISTINGS_DIR, 'listings.json' )
  const LISTINGS_CSV = path.join( LISTINGS_DIR, 'listings.csv' )

  const TYPE_LANDMARK = 1
  const TYPE_UA = 2
  const TYPE_RIALTO = 3
  const TYPE_PFA = 4
  const TYPE_PARKWAY = 5
  const TYPE_ROXIE = 6
  const TYPE_CASTRO = 7
  const HEADINGS = [ 'Date', 'Title', 'Theater', 'Trailer', 'Reviews', 'Synopsis', 'Times' ]

  const THEATERS = [
    {
      title: 'Shattuck Cinemas',
      url: 'https://www.landmarktheatres.com/san-francisco-east-bay/shattuck-cinemas',
      filename: `${HTML_DIR}/shattuck.htm`,
      type: TYPE_LANDMARK
    },
    {
      title: 'Albany Twin',
      url: 'https://www.landmarktheatres.com/san-francisco-east-bay/albany-twin',
      filename: `${HTML_DIR}/albany-twin.htm`,
      type: TYPE_LANDMARK
    },
    {
      title: 'California',
      url: 'https://www.landmarktheatres.com/san-francisco-east-bay/california-theatre',
      filename: `${HTML_DIR}/california-theatre.htm`,
      type: TYPE_LANDMARK
    },
    {
      title: 'Piedmont',
      url: 'https://www.landmarktheatres.com/san-francisco-east-bay/piedmont-theatre',
      filename: `${HTML_DIR}/piedmont-theatre.htm`,
      type: TYPE_LANDMARK
    },
    {
      title: 'Elmwood',
      url: 'https://www.rialtocinemas.com/index.php?location=elmwood',
      filename: `${HTML_DIR}/elmwood.htm`,
      type: TYPE_RIALTO
    },
    {
      title: 'Cerrito',
      url: 'https://www.rialtocinemas.com/index.php?location=cerrito',
      filename: `${HTML_DIR}/cerrito.htm`,
      type: TYPE_RIALTO
    },
    {
      title: 'UA Berkeley',
      url: 'https://www.regmovies.com/theatres/regal-ua-berkeley/1172',
      filename: `${HTML_DIR}/ua-berkeley.htm`,
      type: TYPE_UA
    },
    {
      title: 'BAM/PFA',
      url: 'https://bampfa.org/visit/calendar',
      filename: `${HTML_DIR}/pfa.htm`,
      type: TYPE_PFA
    },
    {
      title: 'New Parkway',
      url: 'http://www.thenewparkway.com/',
      filename: `${HTML_DIR}/parkway.htm`,
      type: TYPE_PARKWAY
    },
    {
      title: 'Roxie',
      url: 'https://www.roxie.com/calendar/',
      filename: `${HTML_DIR}/roxie.htm`,
      type: TYPE_ROXIE
    },
    {
      title: 'Castro',
      url: 'http://www.castrotheatre.com/p-list.html',
      filename: `${HTML_DIR}/castro.htm`,
      type: TYPE_CASTRO
    }
  ]

  const TODAY = moment().format().slice( 0, 10 )
  console.error( TODAY )

  let theaterData = []
  theaterData.push( HEADINGS )

  async.each( THEATERS, getTheaterData, (err) => {
    if (err) {
      console.error( 'error: ' + err )
    } else {
      console.error( 'Success' )
      fs.writeFile( LISTINGS_JSON, JSON.stringify( theaterData ), () => {} )
      fs.writeFile( LISTINGS_CSV, csv.stringify( theaterData ), () => {} )
    }
  } )


  function getTheaterData( theater, callback )
  {
    if (!fs.existsSync( theater.filename ) || program.forceNewData) {
      console.error( `${theater.url}: requesting` )

      let h = (theater.url.match( /^https/ ) ? https : http)
      h.get( theater.url, function( res ) {
        console.error( `${theater.url}: receiving` )

        if (res.statusCode != 200) {
          res.resume()
          return callback( `${theater.url}: Status Code: ${res.statusCode}` )
        }

        // write the page to a file
        // res is a http.IncomingMessage -> ReadableStream
        // readable.pipe( writeable )
        res.pipe( fs.createWriteStream( theater.filename ) )
        res.on( 'end', processTheaterFile );
      })
    } else {
      processTheaterFile()
    }

    function processTheaterFile()
    {
      fs.readFile( theater.filename, 'utf8', (err, html) => {
        if (err) {
          return callback( err )
        }

        console.error( `read file ${theater.filename}` )
        Array.prototype.push.apply( theaterData, processTheaterHTML( html ) )
        callback()
      })
    }

    function processTheaterHTML( html )
    {
      const {window} = new JSDOM( html )
      const $ = jquery( window )
      let results = []
      const theaterLink = `<a href='${theater.url}' target=_blank>${theater.title}</a>`
      let title = ''
      let showDate = TODAY
      let trailerLink = ''
      let synopsis = ''

      function addResult( showDate, title, trailerLink, synopsis, times )
      {
        times.forEach( (v,i,a) => {
          if (a[i]) {
            a[i] = a[i].replace( /[^0-9:]/g, '' )
            a[i].toUpperCase()
          }
        } )

        times = times.filter( e => e )

        const href = "http://rottentomatoes.com/search/?search=" + title.toLowerCase().replace( "'", "" )
        const rtLink = `<a href='${href}' target=_blank>Reviews</a>`

        if (times.length) {
          let result = [ showDate, title.toUpperCase(), theaterLink, trailerLink, rtLink, synopsis, times ]
          results.push( result )
        }
      }

      if (theater.type == TYPE_LANDMARK) {
        $('.filmItem').each( (i,e) => {
          title = $('.filmItemTitle', e).text().trim()
          synopsis = $('.filmItemSynopsis', e).text()

          $('.filmItemLinks a', e).each( (i,e) => {
            if ($(e).text() == 'Trailer') {
              const href = $(e).attr( 'href' )
              trailerLink = `<a href='${href}' target=_blank>Trailer</a>`
            }
          })

          $(`.filmItemTimes`, e).each( (i,e) => {
            showDate = $(e).attr( 'data-film-session' )
            let times = []
            $('.filmTimeItem', e).each( (i,e) => {
              times.push( $(e).text().trim() )
            })

            addResult( showDate, title, trailerLink, synopsis, times )
          })
        })
      } else if (theater.type == TYPE_RIALTO) {
        $('table.features').each( (i,e) => {
          title = $('td.link h2 a', e).text().trim()
          const timesList = $('td.link div:nth-child(6)', e).text().trim()
          if (timesList) {
            const times = timesList.split( ',' )
            addResult( showDate, title, trailerLink, synopsis, times )
          }
        })
      } else if (theater.type == TYPE_UA) {
        $('.showtime-panel').each( (i,e) => {
          title = $('.info-cell .title', e).text().trim()

          let times = []
          $('.showtime-entry .btn', e).each( (i,e) => {
            times.push( $(e).text() )
          })

          addResult( showDate, title, trailerLink, synopsis, times )
        })
      } else if (theater.type == TYPE_PFA) {
        const singleDay = $(`.single-day[data-date="${TODAY}"]` )
        $('.calendar-event', singleDay).each( (i,e) => {
          if (!$('.calendar_filter li', e).text().match( /Film/ )) {
            return
          }

          title = $('.title a', e).text().trim()
          const time = $('.time', e).text()
          const times = [time]

          addResult( showDate, title, trailerLink, synopsis, times )
        })
      } else if (theater.type == TYPE_PARKWAY) {
        $('.eventDay').each( (i,e) => {
          showDate = new Date( $('.date a', e).text() ).toISOString().slice( 0, 10 )

          $('.event', e).each( (i,e) => {
            const time = $('.startTime', e).text()
            title = $('.summary', e).text().trim()
            const m = title.match( /(.*)\(purchase tickets online\)/i )
            if (m) {
              title = m[1].trim()
            }

            addResult( showDate, title, trailerLink, synopsis, [time] )
          })
        })
      } else if (theater.type == TYPE_ROXIE) {
        $('.ai1ec-day').each( (i,e) => {
          let titles = []
          let times = []
          const day = pad( 2, $('.ai1ec-date', e).text(), '0' )
          showDate = TODAY.replace( /-\d+$/, '-' + day )
          $('table.roxie-showtimes-table tr', e).each( (i,e) => {
            title = $('a', e).text().trim()
            if (title) {
              titles.push( title )
            }

            let time = $('.now-playing-times-month', e).text().trim()
            time = time.replace( /[^ -~]/g, '' )
            time = time.replace( /pm/, ' pm' )
            time = time.replace( /am/, ' am' )
            if (time) {
              times.push( time )
            }
          })

          titles.forEach( (v,i) => {
            addResult( showDate, v, trailerLink, synopsis, [times[i]] )
          })
        })
      }

      return results
    }
  }

})()

/*

// times are in secs since epoch
function timesToList( &$times )
{
  sort( $times );
  array_walk( $times, function (&$v) { $v = date( 'g:i a', $v ); } );
}

*/
