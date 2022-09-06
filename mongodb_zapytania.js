//Zapytania:
db.getCollection('stolice').find().sort({"obiekty kulturalne" : -1}).limit(3); //lista 3 stolice mające najwiecej obiektow kulturalnych
db.getCollection('stolice').find().sort({ "populacja": -1 }); //ranking populacji
db.getCollection('stolice').find().sort({"rok powstania" : -1}).limit(2); // dwie najmlodsze stolice
db.getCollection('stolice').find().sort({"rok powstania" : 1}).limit(2); //dwie najstarsze stolice
db.getCollection('stany').find({"powierzchnia":{$eq:149.9}}); //stan o powierzchni 149
db.getCollection('stany').find({ $or:[ {"powierzchnia":{ $gte:400.0 }},{"ludnosc":{ $gte:"40,000" }} ] }) //stan, ktory ma powierzchnie allbo ludnosc powyzej 
db.getCollection("stany").find({ $nor:[ {"liczba hrabstw":5},{"ludnosc":"1,285" } ] }) //zwraca dokumenty, które nie spełniaj  ̨a kryterium liczby hrabstw=5 oraz
ludnoci równej 1,285
db.stolice.find({ $and:[ {"populacja":{$lte:979263} },{"rok powstania":1835} ] }) //zwraca populacje, ktora ma dany warunek
db.stolice.find({ "rok powstania": {$not: {$gt: 1830} } }) //rok powstania, ktory nie wpelnia wymogu powyzej 1830

//Aktualizacja, usuwanie
db.getCollection("stolice").update({nazwa:"Tallahassee"},{$addToSet: {"obiekty kulturalne":["Mission San Luis"]}}) //dodanie do Tallahesee obiektu 
db.stany.update({"powierzchnia":{$lte:100}}, {$inc: {"powierzchnia":10}},{multi:true}) //
db.getCollection("stolice").deleteOne({"burmistrz":"Kirk Caldwell"}) // usuniecie stolicy ktora ma takiego burmistrza
db.stolice.update({"populacja":{$gte:902073}}, {$inc: {"populacja":-73}}) //aktualizacja liczby ludnosci powyzej danej liczby zmniejszajac ludnosc o liczbe 73
db.stany.update({nazwa:"Floryda"},{$push: {uniwersytety:["Miami Dade College", "Broward College-Weston"]}}); //update uniwersytetow w stanie Floryda
db.stolice.update({"obiekty kulturalne.nazwa":"Grand Ole Opry"},{"$set":{"obiekty kulturalne.$.atrakcyjność":NumberInt(4)}}); //aktualizacja stopnia atrakcyjnosci 

//agregacje:
//obliczanie sredniej z ocen atrakcji w kazdej stolicy
db.stolice.aggregate( [
    {$unwind: "$obiekty kulturalne"},
   { $group: { _id: "$nazwa", srednia: { $avg: "$obiekty kulturalne.atrakcyjność" } } }
] )

//ranking atrakcyjnosci miast
db.stolice.aggregate( [
    {$unwind: "$obiekty kulturalne"},
   { $group: { _id: "$nazwa", sredniazobiektow: { $avg: "$obiekty kulturalne.atrakcyjność" } } },
   { $sort : { sredniazobiektow : -1 } }
] )

//grupowanie liczb hrabstw
db.stany.aggregate( [
{
$bucket: {
groupBy: "$liczba hrabstw",
boundaries: [ 10, 30, 70, 90, 105, 120,160 ], default: "Inni",
output: { "liczbahrabstw" : { $push: "$liczba hrabstw" } }
}
}
] ) 

//zlaczanie kolekcji stany z kolekcja stolice
db.stany.aggregate( [
   {
     $lookup:
       {
         from: "stolice",
         localField: "stolica",
         foreignField: "_id",
         as: "informacje_o_stolicy"
       }
  }
] )

//losowanie stolicy
db.stolice.aggregate( [
{ $sample: { size:1 } },
{ $project: { _id:0, nazwa:1 } }
] )

//zlaczenie kolekcji stany z kolekcj  ̨a stolice i wy  ́swietlenie ka  ̇zdego stanu
ze  ́srednia ocen z obiektów w danej stolicy, posortowane malejaco
db.stany.aggregate( [
   {
     $lookup:
       {
         from: "stolice",
         localField: "stolica",
         foreignField: "_id",
         as: "stolice"
       },
   },
       
       {$unwind: "$stolice"},
       {$unwind: "$stolice.obiekty kulturalne"},
       { $group: { _id: "$nazwa", sredniazobiektow: { $avg: "$stolice.obiekty kulturalne.atrakcyjność" } } },
       { $sort : { sredniazobiektow : -1 } }
] )
//sortowanie po powierzchni i ludnosci 
db.stany.aggregate( [
{ $sort: { powierzchnia:1, ludnosc:1 } },
{ $project: { _id:0, nazwa:1, skrot:1,powierzchnia:1, ludnosc:1 } }
] )

//wyswietlanie statystyk dla kazdej z kolekcji
db.stolice.aggregate( [ { $collStats: { storageStats: { } } } ] )
db.stany.aggregate( [ { $collStats: { storageStats: { } } } ] )

//Funkcje operujace na kolekcji mongodb:
// dodanie stolicy 
function dodajStolice(nazwa, burmistrz, populacja, rokpowstania, obiektykulturalne ) {
id = ObjectId();
db.stolice.insert({
"_id":id,
"nazwa": nazwa,
"burmistrz": burmistrz,
"populacja": populacja,
"rok powstania": rokpowstania, 
"obiekty kulturalne": obiektykulturalne
});
return id;
}
dodajStolice("Rhode Island","Daniel McKee",1059640,4001,["RISD Museum","Rosecliff"])

//pobranie id stanu 
function pobierzIdStanu(nazwa, skrot) {
id = db.stany.findOne({"nazwa":nazwa,"skrot":skrot},{_id:1})
if(id!==null) return id._id;
else return null;
}

pobierzIdStanu("Hawaje","HI")

//wyswietlenie obiektow/ atrakcji w danym stanie:
function ObiektyKulturalneStanu(nazwa, skrot) {
stan = db.stany.findOne({"nazwa":nazwa,"skrot":skrot},{stolica:1})
if(stan!==null)
{ 
    stolica = db.stolice.findOne({"_id":stan.stolica})
    if(stolica !== null)
        return stolica["obiekty kulturalne"];
    else 
        return null;
        
}
else return null;
}

ObiektyKulturalneStanu("Hawaje","HI");
 


