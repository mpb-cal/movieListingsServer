const path = require('path');
const fs = require('fs');
const async = require('async');
const csv = require('csv-string');
const program = require('commander');
const theater = require('./theaterFunctions.js');

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

const HEADINGS = [ 'Date', 'Title', 'Theater', 'Trailer', 'Reviews', 'Synopsis', 'Times' ];

const THEATERS = [
  {
    title: 'Shattuck Cinemas',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/shattuck-cinemas',
    filename: `${HTML_DIR}/shattuck.htm`,
    type: theater.THEATER_TYPES.LANDMARK
  },
  {
    title: 'Albany Twin',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/albany-twin',
    filename: `${HTML_DIR}/albany-twin.htm`,
    type: theater.THEATER_TYPES.LANDMARK
  },
  {
    title: 'California',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/california-theatre',
    filename: `${HTML_DIR}/california-theatre.htm`,
    type: theater.THEATER_TYPES.LANDMARK
  },
  {
    title: 'Piedmont',
    url: 'https://www.landmarktheatres.com/san-francisco-east-bay/piedmont-theatre',
    filename: `${HTML_DIR}/piedmont-theatre.htm`,
    type: theater.THEATER_TYPES.LANDMARK
  },
  {
    title: 'Elmwood',
    url: 'https://www.rialtocinemas.com/index.php?location=elmwood',
    filename: `${HTML_DIR}/elmwood.htm`,
    type: theater.THEATER_TYPES.RIALTO
  },
  {
    title: 'Cerrito',
    url: 'https://www.rialtocinemas.com/index.php?location=cerrito',
    filename: `${HTML_DIR}/cerrito.htm`,
    type: theater.THEATER_TYPES.RIALTO
  },
  {
    title: 'UA Berkeley',
    url: 'https://www.regmovies.com/theatres/regal-ua-berkeley/1172',
    filename: `${HTML_DIR}/ua-berkeley.htm`,
    type: theater.THEATER_TYPES.UA
  },
  {
    title: 'BAM/PFA',
    url: 'https://bampfa.org/visit/calendar',
    filename: `${HTML_DIR}/pfa.htm`,
    type: theater.THEATER_TYPES.PFA
  },
/*  {
    title: 'New Parkway',
    url: 'https://www.thenewparkway.com/',
    filename: `${HTML_DIR}/parkway.htm`,
    type: vTHEATER_TYPES.PARKWAY
  },
*/  {
    title: 'Roxie',
    url: 'https://www.roxie.com/calendar/',
    filename: `${HTML_DIR}/roxie.htm`,
    type: theater.THEATER_TYPES.ROXIE
  },
  {
    title: 'Castro',
    url: 'http://www.castrotheatre.com/p-list.html',
    filename: `${HTML_DIR}/castro.htm`,
    type: theater.THEATER_TYPES.CASTRO
  }
];

let theaterData = [HEADINGS];

async.each(THEATERS, (item, callback) => theater.getTheaterData(item, program.forceNewData, callback), (err) => {
  if (err) {
    console.error('error: ' + err);
  } else {
    console.log(`Writing JSON file ${LISTINGS_JSON}`);
    fs.writeFile(LISTINGS_JSON, JSON.stringify(theaterData), () => {});
    console.log(`Writing CSV file ${LISTINGS_CSV}`);
    fs.writeFile(LISTINGS_CSV, csv.stringify(theaterData), () => {});
  }
});

