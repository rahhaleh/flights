

let flightArray=[];

require('dotenv').config();


const express=require('express');
const superagent=require('superagent');
const pg =require('pg');
const methodOverride=require('method-override');

const client = new pg.Client(process.env.DATABASE_URL)
const app=express();
const PORT =process.env.PORT;

app.use(express.urlencoded({ extended: true }));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(methodOverride('_method'));

app.get('/',renderHomePage);
app.post('/search',getData);
app.post('/review', renderReview);
app.post('/community', saveToDB);
app.get('/community', renderCommunity);


function Flight(data){
this.flight_date=(data.flight_date)?data.flight_date:'no available flight date';
this.flight_status=(data.flight_status)?data.flight_status:'no available flight status';
this.departure=(data.departure.airport)?data.departure.airport:'no available departure';
this.arrival=(data.arrival.airport)?data.arrival.airport:'no available arrival';
this.airline=(data.airline.name)?data.airline.name:'no available airline name';
this.flight=(data.flight.number)?data.flight.number:'no available flight number';
}

// 1- insert all the NEW airlines names to the airlines table getting them from the flights_info table in the airline column.
// 2- select all unique airline names from table airlines to loop throw them.
// 3- loop throw the airline names and calculate the average using sql AVG function and push them into ratesArr.
// 4- combine the airlinesNamesArr and ratesArr into one array of objects.
// 5- sort the array of objects and then render the page.
function renderHomePage(request,response){
    let combinedArrOfObj=[];
    let sql;
    sql = `INSERT INTO airlines (airline) SELECT airline FROM flights_info WHERE flights_info.airline NOT in (SELECT airline FROM airlines)`;
    client.query(sql).then(()=>{
        sql = `SELECT DISTINCT airline FROM airlines`;
        client.query(sql).then(result=>{
            let airlinesNamesArr= result.rows.map(obj=>Object.values(obj)[0]);
            sql = `SELECT AVG(flight_rate) FROM reviews WHERE flight_id in (select id from flights_info where airline = $1)`;
            let ratesArr=[];
            for (let i = 0; i < airlinesNamesArr.length; i++) {
                let values=[airlinesNamesArr[i]];
                ratingPromis=client.query(sql,values).then(result=>{
                    ratesArr.push(parseFloat(result.rows[0].avg).toFixed(2));
                });             
            }
            ratingPromis.then(()=>{
                for (let j = 0; j < airlinesNamesArr.length; j++) {
                    combinedArrOfObj[j]={[airlinesNamesArr[j]]:ratesArr[j]};
                }
                //sorting the combinedArrOfObj from hieght rate to lowest.
                combinedArrOfObj.sort((a,b)=>Object.values(b)[0]-Object.values(a)[0]);
                response.render('./',{result:combinedArrOfObj});
                console.log('combinedArrOfObj', combinedArrOfObj);
            });
        });
    });
    
}

function getData(request,response){
    let departure;
    let arrival;
    
    const airlineName=request.body.airline;
    const flightNumber=(request.body.flightnumber)?request.body.flightnumber:' ';
    const key=process.env.FLIGHT_KEY;
    let url=`http://api.aviationstack.com/v1/flights?access_key=${key}&airline_name=${airlineName}`

    if(request.body.departure && request.body.arrival){
        console.log('inside if');
        const iata=require('./data/iata.json');
        iata.forEach(element => {
            if(element.city===request.body.departure ||element.state===request.body.departure ){
                departure  =  element.code;
                console.log('departure',departure);
            }
            if(element.city===request.body.arrival||element.state===request.body.arrival){
                arrival  =  element.code;
                console.log('arrival',arrival);
            }
        });      
        url=`${url}&dep_iata=${departure}&arr_iata=${arrival}`;
    }
    if(request.body.flightnumber){
        console.log('inside second if');
        url=`${url}&flight_number=${flightNumber}`;
    }
    url=`${url}&limit=5`;
    console.log('last url////////////////////////////',url)
    superagent.get(url).then(apiResponse=>{
      console.log(apiResponse.body.data);
      flightArray= apiResponse.body.data.map(element=>{
      return new Flight(element);
      })
      response.render('./pages/show',{ searchResults: flightArray });
  }).catch((err)=> {
    console.log(err);
  });
 
}
function renderReview(request, response){
    let data =request.body;
    let SQL = `INSERT INTO flights_info (flight_num,airline,departure,arrival,flight_date,flight_status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`
    let values=[data.flight_num, data.airline, data.departure, data.arrival, data.flight_date, data.flight_status];
    let resDBPromis=client.query(SQL,values);
    response.render('./pages/review',{result : request.body} );
}
function saveToDB(request, response)
{
    let SQL = 'select max(id) from flights_info';
    client.query(SQL).then(result=>{
        let sql = 'INSERT INTO reviews (flight_id, user_name , comment ,flight_rate)Values($1,$2,$3,$4) RETURNING *'
        let values = [result.rows[0].max,request.body.userName , request.body.userReview ,request.body.rate]
        client.query(sql,values).then(result=>{
            response.redirect('/community');
        });
    });
}

function renderCommunity(request,response){

    console.log('in render community')

    let SQL = `SELECT count(id) FROM flights_info`;
    client.query(SQL).then(result=>{
        let numberOfRows = parseInt(result.rows[0].count);
        console.log('numberOfRows', numberOfRows);
        let resultsDataArr=[];
        let sql;
        for (let i = 1; i <= numberOfRows; i++) {
                let values=[i];
                sql = `SELECT flight_num,airline,departure,arrival,flight_date,flight_status FROM flights_info WHERE id=$1`
                client.query(sql,values).then(fResult=>{
                    resultsDataArr.unshift(fResult.rows[0]);
                });
                sql =`SELECT user_name , comment ,flight_rate FROM reviews WHERE id=$1`
                //solve it Nizar
                waitingPromise = client.query(sql,values).then(rResult=>{
                    resultsDataArr.unshift(rResult.rows[0]);
                });
            }
                waitingPromise.then(()=>{
                    response.render('./pages/community',{result:resultsDataArr});
                    console.log('resultsDataArr', resultsDataArr);
                });

    });
}

client.connect(()=>{
    app.listen(PORT, () => {console.log(`Listening to Port ${PORT}`);});
})


