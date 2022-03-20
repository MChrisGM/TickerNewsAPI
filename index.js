const express = require('express')
const axios = require('axios');
const cheerio = require('cheerio');
const app = express()
const port = process.env.PORT || 8080;

let TICKER_TABLE = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/',function(req, res){
  // res.send(TICKER_TABLE);
  res.send();
});

app.post('/api/', function(req, res) {
  const ticker = req.body.ticker;
  let result = getData(ticker);
  res.send({
    'ticker': ticker,
    'result':{
      'code':result.code,
      'error':result.error,
      'output':result.output,
    }
  });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  updateTable();
  setInterval(async function () {
    updateTable();
  }, 20 * 60000);
  // }, 10000);
})

async function updateTable(){
  console.log('Updating ticker table');
  let updated = await updateTickerTable();
  if(updated){
    console.log('Succesfully updated ticker table');
  }
}

function getData(ticker){
  let result = {
    code:0,
    error:0,
    output:0,
  }

  const tickerExists = checkTicker(ticker);
  
  if(!tickerExists){
    result.code = 400;
    result.error = `Could not find ticker: ${ticker}`;
  }else{
    let tickerInfo = getTickerInfo(ticker);
    

    
  }

  return result;
  
}

function checkTicker(ticker){
  if(ticker.toUpperCase() in TICKER_TABLE || ticker in TICKER_TABLE){
    return true;
  }
  return false;
}

async function getTickerInfo(ticker){
  

  
}

async function updateTickerTable(){
  const url = `https://stockanalysis.com/stocks/`;
  try {
    const response = await axios.get(url);
    let $ = cheerio.load(response.data);
    JSON.parse($("#__NEXT_DATA__")[0].children[0].data).props.pageProps.stocks.forEach(el=>{
      TICKER_TABLE[el.s] = {
          ticker:el.s,
          name:el.n,
          industry:el.i,
          market_cap:el.m
        };
    });
    return true;
  } catch (e) {
    console.error(e.message);
    return false;
  }
}