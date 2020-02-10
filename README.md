# Movie Listings Server

Reads web pages of local movies theaters nightly. Extracts showtimes from HTML, stores data in JSON and CSV files which are served by a node/express server. I made this because google took away google movies, which was simple and good, and I don't want to have to open 10 or more tabs to see what movies are playing.

Developed with:
- express.js for back end server
- underscore.js and async.js for general utilities
- jsdom and jquery for screen scraping
- moment.js for working with dates
- PUG template language

To run the server:
1. `npm start`
2. browse to http://localhost:5500

Nightly:
1. `cd getListings`
2. `mkdir theaterPages theaterData`
3. `npm start`

one change


