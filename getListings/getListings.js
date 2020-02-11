
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const async = require('async');
const moment = require('moment');
const csv = require('csv-string');
const pad = require('pad');
const jsdom = require('jsdom');
const jquery = require('jquery');
const program = require('commander');
const { JSDOM } = jsdom;

program
  .version('0.1.0')
  .option('-f, --force-new-data', 'Ignore cache and download new theater data')
  .parse(process.argv);

if (!program.forceNewData) {
  console.log('Run with -f to ignore cache and download new theater data');
}

const HTML_DIR = path.join(__dirname, 'theaterPages');
const LISTINGS_DIR = path.join(__dirname, 'theaterData');
const LISTINGS_JSON = path.join(LISTINGS_DIR, 'listings.json');
const LISTINGS_CSV = path.join(LISTINGS_DIR, 'listings.csv');

const TYPE_LANDMARK = 1;
const TYPE_UA = 2;
const TYPE_RIALTO = 3;
const TYPE_PFA = 4;
const TYPE_PARKWAY = 5;
const TYPE_ROXIE = 6;
const TYPE_CASTRO = 7;

const HEADINGS = [ 'Date', 'Title', 'Theater', 'Trailer', 'Reviews', 'Synopsis', 'Times' ];

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
    title: 'UA Berkeley', // need to download manually
    url: 'https://www.regmovies.com/theatres/regal-ua-berkeley/1172',
    filename: `${HTML_DIR}/ua-berkeley.htm`,
    type: TYPE_UA
  },
  {
    title: 'BAM/PFA', // broken
    url: 'https://bampfa.org/visit/calendar',
    filename: `${HTML_DIR}/pfa.htm`,
    type: TYPE_PFA
  },
  {
    title: 'New Parkway', // broken
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
    title: 'Castro',  // broken
    url: 'http://www.castrotheatre.com/p-list.html',
    filename: `${HTML_DIR}/castro.htm`,
    type: TYPE_CASTRO
  }
];

const TODAY = moment().format().slice(0, 10);

let theaterData = [HEADINGS];

async.waterfall([
    () => async.each(THEATERS, getTheaterData, (err) => console.error('error: ' + err))
  ],
  (err) => {
    if (err) {
      console.error('error: ' + err);
    } else {
      console.log(`Writing JSON file ${LISTINGS_JSON}`);
      fs.writeFile(LISTINGS_JSON, JSON.stringify(theaterData), () => {});
      console.log(`Writing CSV file ${LISTINGS_CSV}`);
      fs.writeFile(LISTINGS_CSV, csv.stringify(theaterData), () => {});
    }
  }
);

// callback must be called with an error
function getTheaterData(theater, callback)
{
  console.log('getTheaterData: ' + theater.title);

  if (!fs.existsSync(theater.filename) || program.forceNewData) {
    console.log(`Requesting ${theater.url}`);

    let h = (theater.url.match(/^https/) ? https : http);
    h.get(theater.url, function(res) {
      console.log(`Receiving ${theater.url}`);

      if (res.statusCode != 200) {
        res.resume();
        return callback(`${theater.url}: Status Code: ${res.statusCode}`);
      }

      // write the page to a file
      // res is a http.IncomingMessage -> ReadableStream
      // readable.pipe( writeable )
      console.log(`Writing HTML file ${theater.filename}`);
      res.pipe(fs.createWriteStream(theater.filename));
      res.on('end', processTheaterFile);
    });
  } else {
    processTheaterFile();
  }

  function processTheaterFile()
  {
    console.log(`Reading HTML file ${theater.filename}`);

    fs.readFile(theater.filename, 'utf8', (err, html) => {
      if (err) {
        return callback(err);
      }

      theaterData = [...theaterData, ...processTheaterHTML(html)];
    });
  }

  function processTheaterHTML(html)
  {
    const {window} = new JSDOM(html);
    const $ = jquery(window);
    let results = [];
    const theaterLink = `<a href='${theater.url}' target=_blank>${theater.title}</a>`;
    let title = '';
    let showDate = TODAY;
    let trailerLink = '';
    let synopsis = '';

    function addResult(showDate, title, trailerLink, synopsis, times)
    {
      times.forEach((v,i,a) => {
        if (a[i]) {
          a[i] = a[i].replace(/[^0-9:]/g, '');
          a[i].toUpperCase();
        }
      });

      times = times.filter(e => e);

      const href = "http://rottentomatoes.com/search/?search=" + title.toLowerCase().replace("'", "");
      const rtLink = `<a href='${href}' target=_blank>Reviews</a>`;

      if (times.length) {
        let result = [ showDate, title.toUpperCase(), theaterLink, trailerLink, rtLink, synopsis, times ];
        results.push(result);
      }
    }

    if (theater.type == TYPE_LANDMARK) {
      $('.filmItem').each((i,e) => {
        title = $('.filmItemTitle', e).text().trim();
        synopsis = $('.filmItemSynopsis', e).text();

        $('.filmItemLinks a', e).each((i,e) => {
          if ($(e).text() == 'Trailer') {
            const href = $(e).attr('href');
            trailerLink = `<a href='${href}' target=_blank>Trailer</a>`;
          }
        });

        //$(`.filmItemTimes`, e).each( (i,e) => {
        $(`.accordion-item`, e).each((i,e) => {
          showDate = $(e).attr('data-film-session');
          let times = [];
          $('.filmTimeItem', e).each((i,e) => {
            times.push($(e).text().trim());
          });

          addResult(showDate, title, trailerLink, synopsis, times);
        });
      });
    } else if (theater.type == TYPE_RIALTO) {
      $('table.features').each((i,e) => {
        title = $('td.link h2 a', e).text().trim();
        const timesList = $('td.link div:nth-child(6)', e).text().trim();
        if (timesList) {
          const times = timesList.split(',');
          addResult(showDate, title, trailerLink, synopsis, times);
        }
      });
    } else if (theater.type == TYPE_UA) {
      $('.movie-row').each((i,e) => {
        title = $('.qb-movie-name', e).text().trim();

        let times = [];
        $('.qb-movie-info-column a.btn', e).each((i,e) => {
          times.push($(e).text());
        });

        addResult(showDate, title, trailerLink, synopsis, times);
      });
    } else if (theater.type == TYPE_PFA) {
      const singleDay = $(`.single-day[data-date="${TODAY}"]`);
      $('.calendar-event', singleDay).each((i,e) => {
        if (!$('.calendar_filter li', e).text().match(/Film/)) {
          return;
        }

        title = $('.title a', e).text().trim();
        const time = $('.time', e).text();
        const times = [time];

        addResult(showDate, title, trailerLink, synopsis, times);
      });
    } else if (theater.type == TYPE_PARKWAY) {
      showDate = new Date($('#tribe-events-header').attr('data-date')).toISOString().slice(0, 10);

      $('#tribe-events-day').each((i,e) => {
        $('.type-tribe_events', e).each((i,e) => {
          const time = $('.time-details', e).text();
          title = $('.tribe-events-list-event-title', e).text().trim();
          const m = title.match(/(.*)\(purchase tickets online\)/i);
          if (m) {
            title = m[1].trim();
          }

          addResult(showDate, title, trailerLink, synopsis, [time]);
        });
      });
    } else if (theater.type == TYPE_ROXIE) {
      $('.ai1ec-day').each((i,e) => {
        let titles = [];
        let times = [];
        const day = pad(2, $('.ai1ec-date', e).text(), '0');
        showDate = TODAY.replace(/-\d+$/, '-' + day);

        $('table.roxie-showtimes-table tr:even', e).each((i,e) => {
          title = $('a', e).text().trim();
          if (title) {
            titles.push(title);
          }
        });

        $('table.roxie-showtimes-table tr:odd', e).each((i,e) => {
          let time = $('.now-playing-times-month', e).text().trim();
          time = time.replace(/[^ -~]/g, '');
          time = time.replace(/pm/, ' pm');
          time = time.replace(/am/, ' am');
          if (time) {
            times.push(time);
          }
        });

        titles.forEach((v,i) => {
          addResult(showDate, v, trailerLink, synopsis, [times[i]]);
        });
      });
    }

    return results;
  }
}

module.exports = getTheaterData;
