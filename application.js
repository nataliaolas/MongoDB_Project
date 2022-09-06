const express = require('express')
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const app = express();
const port = 3000;

const url = 'mongodb://localhost:27017';
const dbName = 'local';
const client = new MongoClient(url, { useUnifiedTopology: true });
client.connect(function(err) {
    assert.equal(null, err);
    console.log("Połączono się poprawnie z bazą");
    });


//navbar
app.use(function (req, res, next) {
    var menu = `
    <a href="/stolica">Dodaj miasto w USA </a> |
    <a href="/lista_stany">Lista stanow w USA wraz z ich skrotami </a> |
    <a href="/atrakcyjnosc-stolice">Lista stolic ze srednia z atrakcji </a> |
    <a href="/update-powierzchnia">Update  </a> |
    <a href="/usuwanie-stanow">Usuwanie </a> |
    <a href="/stolica/:nazwa">Szczególy danej stolicy </a> |
    <a href="/wyswietl_obiekty_kulturalne_stanu">Wyświetl obiekty kulturalne stanu</a> |
    <hr>`;
    req.m = menu;
    next();
});

//opis aplikacji:
app.get('/', function (req, res) {
    res.send(req.m +
        ` <br> Aplikacja umożliwia:
    <ul>
    <li> Formularz dodania stolicy stanu USA </li>
    <li> Lista stanow w USA wraz z ich skrotami </li>
    <li> Lista stolic ze srednia z atrakcji </li>
    <li> Update stanów poniżej powierzchnii 100 i dodanie powierzchni 10 </li>
    <li> Usuwanie stanów, które mają mniej niż 10 hrabstw  </li>
    <li> Lista stolic z ich średnia atrakcyjnoscia obiektow   </li>
    <li> Wyświetlanie szczegółów wybranej stolicy i jej stan   </li>
    </ul>`);
});


//formularz dodanie stolicy USA 
app.get('/stolica', function (req, res) {
    var form = `
                    <form action="/dodanie_stolica" method="GET">
                    DODAJ STOLICE
                    <br/>
                    Nazwa: <input type="text" name="nazwa">
                    <br/>
                    Burmistrz: <input type="text" name="burmistrz">
                    <br/>
                    Liczba ludzi: <input type="text" name="populacja">
                    <br/>
                    Rok powstania: <input type="text" name="rokpowstania">
                    <br/>
                    Obiekty kulturalne: <input type="text" name="obiektykulturalne">
                    <br/>
                    <input type="submit" value="Dodaj">
                    </form>
                    `;
    res.end(form);
    
});


app.get('/dodanie_stolica', async  function(req, res) {
    const db = client.db(dbName);
    const col = db.collection("stolice");
    var nazwa = req.query.nazwa;
    var burmistrz = req.query.burmistrz;
    var populacja = req.query.populacja;
    var rokpowstania = req.query.rokpowstania;
    var obiektykulturalne = req.query.obiektykulturalne;

    const data = {
    "nazwa":nazwa,
    "burmistrz":burmistrz,
    "Liczba ludzi":populacja,
    "Rok powstania":rokpowstania,
    "obiekty kulturalne": obiektykulturalne
    };
    console.log(data);
    const result = await col.insertOne(data);
    console.log(result);
    res.send(req.m + `dodano miasto: ${data.nazwa}`);
    })

  
//LISTA STANÓW USA WRAZ ZE SKROTAMI
    async function asyncCall(res, cursor) {
        var list = "<ol>";
        await cursor.forEach( function( doc) {
        list += `<li> nazwa: ${doc.nazwa} skrót: ${doc.skrot}</li>`;
        });
        list += "</ol>";
        res.send( "Lista stanów w USA: "+list);
        }
        app.get('/lista_stany', function(req, res) {
        const db = client.db(dbName);
        const col = db.collection("stany");
        const cursor = col.find({})
        .sort({"nazwa":1});
        asyncCall(res, cursor);
        })


            //update obiektow kulturalnych
            app.get('/update-powierzchnia', function(req, res) {
                const db = client.db(dbName);
                const col = db.collection("stany");
                col.updateOne({"powierzchnia":{$lte:100}},
                {$inc: {"powierzchnia":10}},{multi:true},
                function(err, ret) {
                assert.equal(null, err);
                res.send( req.m + 
                `Dopasowanych dokumentów: ${ret.matchedCount},
                zaktualizowano dokumentów: ${ret.modifiedCount}`
                );
                })
                })

                //usuwanie 
                app.get('/usuwanie-stanow', function(req, res) {
                    const db = client.db(dbName);
                    const col = db.collection("stany");
                    col.deleteMany({ "liczba hrabstw": {$lte: 10} }, function(err, ret) {
                    assert.equal(null, err);
                    res.send( req.m +`Usuniętych dokumentów: ${ret.deletedCount}`);
                    })
                    })

                  // lista stolic z ich średnia atrakcyjnoscia obiektow 
                    async function atrakcyjnoscStolic(res, cursor, req) {
                        var list = "<ol>";
                        console.log(cursor.data)
                        for await (const doc of cursor){
                            console.log(doc)
                        if(doc) {
                        list += `<li> Miasto:${doc._id} Ocena: ${doc.sredniazobiektow}</li>`;
                        } else {
                        list += "</ol>";
                        }
                        
                        }
                        res.send(req.m + list);
                    }
                    
                    app.get('/atrakcyjnosc-stolice', function(req, res) {
                        const db = client.db(dbName);
                        const col = db.collection("stolice");
            
                        const aggCursor = col.aggregate(
                        [
                            {$unwind: "$obiekty kulturalne"},
                            { $group: { _id: "$nazwa", sredniazobiektow: { $avg: "$obiekty kulturalne.atrakcyjność" } } },
                            { $sort : { sredniazobiektow : -1 } }
                        ]);
                        atrakcyjnoscStolic(res, aggCursor, req);
                        });    
            
            //funkcja z parametrem url wyswietlająca stan oraz jego stolice ze szczegolami
                
            app.get('/stolica/:nazwa', 
                async function testfn(req, res, next) {
                nazwa_stolicy = req.params.nazwa;
                const db = client.db(dbName);
                const stany = db.collection("stany");
                const stolice = db.collection("stolice");
                const stan = await stany.findOne({nazwa : nazwa_stolicy});
                if (!stan)
                {
                    let informacje_o_stanie = "<h3> Nie ma takiego stanu</h3>"
                    res.send(req.m + informacje_o_stanie) 
                    return null;
                }
                const stolica = await stolice.findOne({_id: stan.stolica});
                var uniwerystety = "";
                for await (const doc of stan.uniwersytety){
                    console.log(doc)
                if(doc) {
                    uniwerystety += `<li> ${doc.nazwa}</li>`;
                } else {
                    uniwerystety += "";
                }
            }
                var obiektyKulturalne = "";
                for await (const doc of stolica['obiekty kulturalne']){
                    console.log(doc)
                if(doc) {
                    obiektyKulturalne += `<li> ${doc.nazwa} atrakcyjnosc: ${doc['atrakcyjność']}</li>`;
                } else {
                    obiektyKulturalne += "";
                }
            }
                var informacje_o_stanie = `
                <h2> ${stan.nazwa}</h2>
                <p>skrot: ${stan.skrot}</p>
                <p>liczba ludnosci: ${stan.ludnosc}</p>
                <p>powierzchnia: ${stan.powierzchnia}</p>
                <h4>Uniwyersytety</h4>
                <ol> ${uniwerystety}</ol>
                <h3> stolica: ${stolica.nazwa}</h3>
                <p>burmistrz: ${stolica.burmistrz}</p>
                <p>rok powstania: ${stolica['rok powstania']}</p>
                <p>ludnosc: ${stolica.populacja}</p>
                <h4>obiekty kulturalne:</h4>
                <ol> ${obiektyKulturalne}</ol>
                `;
               res.send(req.m + informacje_o_stanie)      
              });
            
            
            
            //pobranie id stanu z wykorzystaniem tej funkcji niżej, zeby mozna bylo wpisac nazwe i skrot i zeby bylo widac wiecej informacji o tym stanie.
             async function ObiektyKulturalneStanu(nazwa, skrot) {
                const db = client.db(dbName);
                console.log(nazwa, skrot);
                const stany = db.collection("stany");
                stan = await stany.findOne({nazwa:nazwa, skrot:skrot});
                if(stan!==null)
                { 
                    const stolice = db.collection("stolice");
                    stolica = await stolice.findOne({_id:stan.stolica})
                    if(stolica !== null)
                        {
                            var list = "<ol>";
                            for await (const doc of stolica["obiekty kulturalne"]){
                            console.log("DOKUMENT:", doc)
                            if(doc) {
                            list += `<li>${doc.nazwa} atrakcyjnosc: ${doc['atrakcyjność']}</li>`;
                            } else {
                            list += "</ol>";
                            }
                        }
                        list += "</ol>";
                        return list;
                        }
                    else 
                        return null;
                        
                }
                else return null;
                }
                
            
        
            app.get('/wyswietl_obiekty_kulturalne_stanu', function (req, res) {
                var form = `
                                <form action="/obiekty_kulturalne_stanu" method="GET">
                                Wyszukaj informacje o stanie
                                <br/>
                                Nazwa: <input type="text" name="nazwa">
                                <br/>
                                Skrot: <input type="text" name="skrot">
                                <br/>
                                <input type="submit" value="Wyszukaj obiekty kulturalne">
                                </form>
                                `;
                res.send(req.m + form);
                
            });
            
            
            app.get('/obiekty_kulturalne_stanu', async function(req, res) {
                const db = client.db(dbName);
                const col = db.collection("stany");
                var nazwa = req.query.nazwa;
                var skrot = req.query.skrot;
            
                const data = {
                "nazwa":nazwa,
                "skrot":skrot
                };
                console.log(data);
                const obiektyKulturalne = await ObiektyKulturalneStanu(nazwa, skrot);
                res.send(req.m + "Obiekty kulturalne stanu:" + obiektyKulturalne);
                })
            
       


    app.listen(port, function() {
        console.log(`Example app listening at http://localhost:${3000}`)
        })