# Movie Listings Server

Reads web pages of local movies theaters nightly. Extracts showtimes from HTML, stores data in JSON and CSV files which are served by a node/express server.

Developed with:

express.js for back end server

underscore.js and async.js for general utilities

jsdom and jquery for screen scraping

moment.js for working with dates

PUG template language
 
To run the server:

yarn start

http://localhost:5500

Nightly:

cd getListings

mkdir theaterPages theaterData

yarn start



