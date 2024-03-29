let flightArray=[];
let img_color='black';
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
app.get('/community/search/',renderCommunity)
app.get('/about', renderAbout);

app.get('*',(req,res)=>res.render('pages/error'));

function Flight(data,logo){
this.flight_date=(data.flight_date)?data.flight_date:'no available flight date';
this.flight_status=(data.flight_status)?data.flight_status:'no available flight status';
this.departure=(data.departure.airport)?data.departure.airport:'no available departure';
this.arrival=(data.arrival.airport)?data.arrival.airport:'no available arrival';
this.airline=(data.airline.name)?data.airline.name:'no available airline name';
this.flight=(data.flight.number)?data.flight.number:'no available flight number';
this.logo=logo;
}

// 1- insert all the NEW airlines names to the airlines table getting them from the flights_info table in the airline column.
// 2- select all unique airline names from table airlines to loop throw them.
// 3- loop throw the airline names and calculate the average using sql AVG function and push them into ratesArr.
// 4- combine the airlinesNamesArr and ratesArr into one array of objects.
// 5- sort the array of objects and then render the page.
function renderHomePage(request,response){
    let ratingPromis;
    let combinedArrOfObj=[];
    let sql;
    sql = `INSERT INTO airlines (airline,logo) SELECT airline,logo FROM flights_info WHERE flights_info.airline NOT in (SELECT airline FROM airlines)`;
    client.query(sql).then(()=>{
        sql = `SELECT DISTINCT airline,logo FROM airlines`;
        client.query(sql).then(result=>{
            let airlinesNamesArr= result.rows.map(obj=>Object.values(obj)[0]);
            let airlinesLogosArr= result.rows.map(obj=>Object.values(obj)[1]);
            sql = `SELECT AVG(flight_rate) FROM reviews WHERE flight_id in (select id from flights_info where airline = $1)`;
            let ratesArr=[];
            for (let i = 0; i < airlinesNamesArr.length; i++) {
                let values=[airlinesNamesArr[i]];
                ratingPromis=client.query(sql,values).then(result=>{
                    ratesArr.push(parseFloat(result.rows[0].avg).toFixed(2));
                });             
            }
            if(ratingPromis){

                ratingPromis.then(()=>{
                    for (let j = 0; j < airlinesNamesArr.length; j++) {
                        combinedArrOfObj[j]={[airlinesNamesArr[j]]:ratesArr[j],logo:airlinesLogosArr[j]};
                    }
                    //sorting the combinedArrOfObj from hieght rate to lowest.
                    combinedArrOfObj.sort((a,b)=>Object.values(b)[0]-Object.values(a)[0]);
                    response.render('./',{result:combinedArrOfObj});
                });
            }else if(airlinesNamesArr.length===0){
                response.render('./',{result:combinedArrOfObj});
            }
        });
    });
    
}

function getData(request,response){
    let departure;
    let arrival;
    let logo;
    const airlineName=request.body.airline.toLowerCase();
    const flightNumber=(request.body.flightnumber)?request.body.flightnumber:' ';
    const key=process.env.FLIGHT_KEY;
    let url=`http://api.aviationstack.com/v1/flights?access_key=${key}&airline_name=${airlineName}`
    let url_2='https://api.imagga.com/v2/colors?image_url=';

    if(request.body.departure && request.body.arrival){
        const iata=require('./data/iata.json');
        iata.forEach(element => {
            if(element.city && element.state){

                if(element.city.toLowerCase()===request.body.departure.toLowerCase() ||element.state.toLowerCase()===request.body.departure.toLowerCase() ){
                    departure  =  element.code;
                    console.log('departure',departure);
                }
                if(element.city.toLowerCase()===request.body.arrival.toLowerCase()||element.state.toLowerCase()===request.body.arrival.toLowerCase()){
                    arrival  =  element.code;
                    console.log('arrival',arrival);
                }
            }
        });      
        url=`${url}&dep_iata=${departure}&arr_iata=${arrival}`;
    }
    if(request.body.flightnumber){
        url=`${url}&flight_number=${flightNumber}`;
    }
    url=`${url}&limit=50`;

    const airlineLogo=require('./data/airlineLogo.json');
    airlineLogo.forEach(element=>{
        if(element.name.toLowerCase()===airlineName){
           logo =element.logo;
           url_2 += logo;
        }
    });
    if(logo){
            superagent.get(url_2)
        .auth(process.env.IMAGGA_KEY,process.env.IMAGGA_SECRET)
        .then(apiResponse=>{
            img_color=apiResponse.body.result.colors.background_colors[0].html_code;
            console.log('img_color', img_color);
        }).catch((err)=> {
            console.log('error from IMAGGA API','with request:',url_2,'error message:',err);
        });
    }
    superagent.get(url).then(apiResponse=>{
      flightArray= apiResponse.body.data.map(element=>{
      return new Flight(element,logo);
      })
      response.render('./pages/show',{ searchResults: flightArray ,color:img_color,empty:'Sorry, No result for the entered data'});
      console.log('flightArray', flightArray)
      img_color='black';
  }).catch((err)=> {
    console.log('error from aviationstack API',err);
  });
 
}
let holderOfFlightsInfoArr=[];
function renderReview(request, response){
    let data = holderOfFlightsInfoArr = request.body;
    response.render('./pages/review',{result : data} );
}

//called after posting a review.
function saveToDB(request, response)
{
    let data =holderOfFlightsInfoArr;
    let SQL = `INSERT INTO flights_info (flight_num,airline,departure,arrival,flight_date,flight_status,logo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`
    let values=[data.flight_num, data.airline, data.departure, data.arrival, data.flight_date, data.flight_status,data.logo];
    client.query(SQL,values).then(()=>{

        let SQL = 'select max(id) from flights_info';
        client.query(SQL).then(result=>{

            let sql = 'INSERT INTO reviews (flight_id, user_name , comment ,flight_rate)Values($1,$2,$3,$4) RETURNING *'
            let values = [result.rows[0].max,request.body.userName , request.body.userReview ,request.body.rate]
            client.query(sql,values).then(()=>{

                response.redirect('/community');
                holderOfFlightsInfoArr=[];
            });
        });
    });
}

function renderCommunity(request,response){
    let waitingPromise;
    let searchValue=request.query.search;
    let regex= new RegExp(searchValue,'i');
    let searchAirlineFound=false;
    let matchedCommentFound = false;
    
    let SQL = `SELECT count(id) FROM flights_info`;
    client.query(SQL).then(result=>{
        let numberOfRows = parseInt(result.rows[0].count);
        let resultsDataArr=[];
        let temporaryArr=[];
        let sql;
        for (let i = 1; i <= numberOfRows; i++) {
                let values=[i];
                sql = `SELECT flight_num,airline,departure,arrival,flight_date,flight_status,logo FROM flights_info WHERE id=$1`
                client.query(sql,values).then(fResult=>{  
                        if( (searchAirlineFound && matchedCommentFound) || (!searchAirlineFound && !matchedCommentFound)){

                            if(searchValue){
                                temporaryArr=[];
                                temporaryArr= fResult.rows.filter(obj=>{  
                                    searchAirlineFound = regex.test(obj.airline);   
                                    matchedCommentFound=false;
                                    return searchAirlineFound;                              
                                });  
                                if(temporaryArr.length){
                                    resultsDataArr.unshift(temporaryArr[0]);
                                }
                            }else if(!searchValue){
                                resultsDataArr.unshift(fResult.rows[0]);
                            } 
                        }
                });
                sql =`SELECT user_name , comment ,flight_rate FROM reviews WHERE id=$1`
                waitingPromise = client.query(sql,values).then(rResult=>{
                    if(!searchValue){
                        if(rResult.rows[0]){
                            resultsDataArr.unshift(rResult.rows[0]);
                        }
                    }else if(searchAirlineFound && !matchedCommentFound){ 
                        resultsDataArr.unshift(rResult.rows[0]);
                        matchedCommentFound =true;
                    }
                });
            }
                if(waitingPromise){
                    waitingPromise.then(()=>{
                        response.render('./pages/community',{result:resultsDataArr,empty:'Sorry, no matched results'});
                    });
                }else if(numberOfRows===0){
                    response.render('./pages/community',{result:resultsDataArr,empty:'it seems to be empty here! \n try to review a flight'});
                }

    });
}
function renderAbout(req, res)
{
    res.render('./pages/about-us');
}
function searchCommunity(){
 
}

client.connect(()=>{
    app.listen(PORT, () => {console.log(`Listening to Port ${PORT}`);});
})


