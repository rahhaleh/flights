'use strict';

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
app.post('/saveReview', saveToDB);


function Flight(data){
this.flight_date=(data.flight_date)?data.flight_date:'no available flight date';
this.flight_status=(data.flight_status)?data.flight_status:'no available flight status';
this.departure=(data.departure.airport)?data.departure.airport:'no available departure';
this.arrival=(data.arrival.airport)?data.arrival.airport:'no available arrival';
this.airline=(data.airline.name)?data.airline.name:'no available airline name';
this.flight=(data.flight.number)?data.flight.number:'no available flight number';
}

function renderHomePage(request,response){
    response.render('./')
}

function getData(request,response){
    console.log(request.body);
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
        console.log(url);       
    }
    if(request.body.flightnumber){
        console.log('inside second if');
        url=`${url}&flight_number=${flightNumber}`;
        console.log('url',url)
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
    console.log(request.body);
    let SQL = `INSERT INTO flights_info (flight_num,airline,departure,arrival,flight_date,flight_status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`
    let values=[data.flight_num, data.airline, data.departure, data.arrival, data.flight_date, data.flight_status];
    let resDBPromis=client.query(SQL,values);
    response.render('./pages/review',{result : request.body} );
}
function saveToDB(request, response)
{
    //improve the logic here<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    let SQL = 'select max(id) from flights_info';
    client.query(SQL).then(result=>{
        console.log('result', result);
        let sql = 'INSERT INTO reviews (flight_id, user_name , comment ,flight_rate)Values($1,$2,$3,$4) RETURNING *'
        let values = [result.rows[0].max,request.body.userName , request.body.userReview ,request.body.rate]
        client.query(sql,values).then(result=>{
            console.log('result', result.rows);
            let flightDataID =result.rows[0].flight_id;
            let sql = `SELECT flight_num,airline,departure,arrival,flight_date,flight_status FROM flights_info WHERE id=$1`
            let values=[flightDataID];
            client.query(sql,values).then(fData=>{
                console.log('fData', fData.rows);
                response.render('./pages/community',{result:result.rows,fData:fData.rows});
            });
        });
    });
}

client.connect(()=>{
    app.listen(PORT, () => {console.log(`Listening to Port ${PORT}`);});
})


