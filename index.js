const express = require('express')
const axios = require('axios');
const cheerio = require('cheerio');
var request = require('request');
const app = express()
const port = process.env.PORT || 8080;

let TICKER_TABLE = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  // res.send(TICKER_TABLE);
  res.send();
});

app.post('/api/', async function(req, res) {
  const ticker = req.body.ticker;
  const hist = req.body.history;
  let result = await getData(ticker,hist);
  let output = {
    'ticker': ticker,
    'result': {
      'code': result.code,
      'error': result.error,
      'output': result.output,
    }
  };
  res.send(output);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  updateTable();
  setInterval(async function() {
    updateTable();
  }, 20 * 60000);
})

async function updateTable() {
  console.log('Updating ticker table');
  let updated = await updateTickerTable();
  if (updated) {
    console.log('Succesfully updated ticker table');
  }
}

async function getData(tick, hist) {
  let result = {
    code: 0,
    error: 0,
    output: 0,
  }

  const tickerExists = checkTicker(tick);

  if (!tickerExists) {
    result.code = 400;
    result.error = `Could not find ticker: ${tick}`;
  } else {
    let tickerInfo = getTickerInfo(tick);
    const ticker = tickerInfo.ticker;
    const name = tickerInfo.name;
    const industry = tickerInfo.industry;
    const market_cap = tickerInfo.market_cap;

    let searchBatch = hist;
    let postURL = `https://api.queryly.com/cnbc/json.aspx?queryly_key=31a35d40a9a64ab3&query=${name}&endindex=0&batchsize=${searchBatch}&callback=&showfaceted=false&timezoneoffset=0&facetedfields=formats&facetedkey=formats%7C&facetedvalue=!Press%20Release%7C&additionalindexes=4cd6f71fbf22424d,937d600b0d0d4e23,3bfbe40caee7443e,626fdfcd96444f28`;

    let output = [];
    try{
      await new Promise((resolve, reject) => {
        request({
          url: postURL,
          method: "POST",
          json: true
        }, function(error, response, body) {
          if (error) {
            console.log(error);
            reject(error);
          }
          let results = body.results;
          results.sort(function(a, b) {
            var keyA = Date.parse(a.datePublished), keyB = Date.parse(b.datePublished);
            if (keyA < keyB) return 1;
            if (keyA > keyB) return -1;
            return 0;
          });
          results.forEach((article) => {
            output.push({
              datetime: (new Date(Date.parse(article.datePublished))).toJSON(),
              summary: article.summary,
              description: article.description,
            });
          });
          result.code = 200;
          result.output = output;
          resolve();
        });
      });
    }catch(error){
      result.code = 408;
      result.error = `Request timed-out with error: ${error}`;
    }
  }
  return result;
}

function getTickerInfo(ticker) {
  return TICKER_TABLE[ticker.toUpperCase()];
}

function checkTicker(ticker) {
  if (ticker.toUpperCase() in TICKER_TABLE || ticker in TICKER_TABLE) {
    return true;
  }
  return false;
}

async function updateTickerTable() {
  const url = `https://stockanalysis.com/stocks/`;
  try {
    const response = await axios.get(url);
    let $ = cheerio.load(response.data);
    JSON.parse($("#__NEXT_DATA__")[0].children[0].data).props.pageProps.stocks.forEach(el => {
      TICKER_TABLE[el.s] = {
        ticker: el.s,
        name: el.n,
        industry: el.i,
        market_cap: el.m
      };
    });
    return true;
  } catch (e) {
    console.error(e.message);
    return false;
  }
}