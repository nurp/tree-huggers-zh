let colorsMapDb = new Map();
const genusMapDb = new Map();

async function readJsonFile() {
  let response = await fetch("tree.json");
  let data = await response.json();
  return data.features;
}

async function CreateDatabaseFromJson() {
    let futureFeatures = readJsonFile();
    let features = await futureFeatures;

    parseData(features);
    printTrees();
    return;
    printColorCodes();
    printBaumTypes();
    printBaumKategories();
    printBaumStatus();
    printBaumKategories();
    printGenusCodes();
    printBaumGenauigkeit();
  }

  function parseData(features) {
    for (const feat of features) {
      let properties = feat.properties;
      let keyGenus = properties.baumgattunglat;
      if (!genusMapDb.has(keyGenus)) {
        genusMapDb.set(keyGenus, new Map())
      }
      const speciesMap = genusMapDb.get(keyGenus);
      const keySpecies = properties.baumartlat + " (" + properties.baumnamedeu + ")";  // Species
      if (!speciesMap.has(keySpecies)) {
        speciesMap.set(keySpecies, [])
      }
  
      const trees = speciesMap.get(keySpecies)
      trees.push(feat)
      speciesMap.set(keySpecies, trees);
      genusMapDb.set(keyGenus, speciesMap);
    }
  
    genusMapDb.forEach((outerKey) => {
      outerKey.forEach((innerKey) => {
        innerKey.forEach((tree) => {
          let key = tree.properties.baumgattunglat;
          colorsMapDb.set(key, stringToColor(key));
        });
      });
    });
  }
  
  // commit transaction every 1000 insert so that it doesn't take forever...
  // Also find-replace those values instead of inner SELECT statements or improve the code..
  function printTrees() {
    var counter = 0;
    let start=false;
    let text = "BEGIN TRANSACTION;\nDELETE FROM Trees;\n";
    genusMapDb.forEach((outerKey, key) => {
      outerKey.forEach((innerKey, key2) => {
        innerKey.forEach((tree) => {
          if (++counter == 1000) {
            counter =0;
            text += "\nCOMMIT;\n";
            text += "BEGIN TRANSACTION;\n";
          }
          let p = tree.properties;
          if(p.baumnummer != p.poi_id) 
          {
            debugger;
          }
          let kat = 0 ? p.kategorie == "Parkbaum" : 1;
          let stat = 0;
          switch (p.status) {
            case "Obst":
              stat = 0;
              break;
            case "Grünanlage":
              stat = 1;
              break;
            case "Wohnsiedlungen":
              stat = 2;
              break;
            case "Strassenbaum (A)":
              stat = 3;
              break;
            case "Strassenbaum":
              stat = 4;
              break;
            case "Kanton":
              stat = 5;
              break;
            case "Schulen":
              stat = 6;
              break;
          }

          // let genau = 0;
          // switch (p.genauigkeit) {
          //   case "Bildschirmeingabe":
          //     genau = 0;
          //     break;
          //   case "Digitalisierung oder ELTA2":
          //     genau = 1;
          //     break;
          //   case "Unbekannte Qualität":
          //     genau = 2;
          //     break;
          //   case "Luftbild":
          //     genau = 3;
          //     break;
          //   case "Eingemessen":
          //     genau = 4;
          //     break;
          //   case "Eingemessen (Nachpflanzung)":
          //     genau = 5;
          //     break;
          // }

          if (p.strasse == null) p.strasse = "";
          text += `INSERT INTO Trees (Id, PoiId, KategorieId, StatusId, BaumtypId, GenauigkeitId,
             Quartier, Strasse, Baumnamelat, Baumnamedeu, Pflanzjahr, Kronendurchmesser, Lat, Lon,
             BaumGattungLatId, BaumArtLatId)
          VALUES (
            ${p.objid},
            '${p.poi_id}',
            ${kat}, 
            ${stat},
            ${p.baumtyp},
            (SELECT Id from Genauigkeit WHERE Name='${p.genauigkeit}'),
            '${p.quartier}',
            '${p.strasse}',
            '${p.baumnamelat}',
            '${p.baumnamedeu}',
            ${p.pflanzjahr},
            ${p.kronendurchmesser},
            ${tree.geometry.coordinates[1]},
            ${tree.geometry.coordinates[0]},
            (SELECT Id FROM BaumGattungLat WHERE BaumGattungLat.Name = '${key}'),
            (SELECT Id FROM BaumArtLat WHERE BaumArtLat.Name = '${key2}')
          );` + "\n";
        });
      });
    });
    text += "\nCOMMIT;\n";
    console.log(text);
  }
  
  function printBaumStatus() {
    let bauMap = new Map();
    let i=0;
    genusMapDb.forEach((outerKey, key) => {
      outerKey.forEach((innerKey, key2) => {
        innerKey.forEach((tree) => {
          let gen = tree.properties.status;
          if(!bauMap.has(gen)){
            bauMap.set(gen, i);
            i++;
          }
        });
      });
    });
    let text = "BEGIN TRANSACTION;\n";
    // let sortedKeys = [...bauMap.keys()].sort(); 
    bauMap.forEach( (id, name) => {
      text += `INSERT INTO Status (Id, Name) VALUES (${id}, '${name}');` + "\n";
    });
    text += "\nCOMMIT;\n";
    console.log(text);
  }
  
  function printBaumKategories() {
    let bauMap = new Map();
    let i=0;
    genusMapDb.forEach((outerKey, key) => {
      outerKey.forEach((innerKey, key2) => {
        innerKey.forEach((tree) => {
          let gen = tree.properties.kategorie;
          if(!bauMap.has(gen)){
            bauMap.set(gen, i);
            i++;
          }
        });
      });
    });
    let text = "BEGIN TRANSACTION;\n";
    // let sortedKeys = [...bauMap.keys()].sort(); 
    bauMap.forEach( (id, name) => {
      text += `INSERT INTO Kategories (Id, Name) VALUES (${id}, '${name}');` + "\n";
    });
    text += "\nCOMMIT;\n";
    console.log(text);
  }
  
  function printBaumGenauigkeit() {
    let bauMap = new Map();
    let i=0;
    genusMapDb.forEach((outerKey, key) => {
      outerKey.forEach((innerKey, key2) => {
        innerKey.forEach((tree) => {
          let gen = tree.properties.genauigkeit;
          if(!bauMap.has(gen)){
            bauMap.set(gen, i);
            i++;
          }
        });
      });
    });
    let text = "BEGIN TRANSACTION;\n";
    // let sortedKeys = [...bauMap.keys()].sort(); 
    bauMap.forEach( (id, name) => {
      text += `INSERT INTO Genauigkeit (Id, Name) VALUES (${id}, '${name}');` + "\n";
    });
    text += "\nCOMMIT;\n";
    console.log(text);
  }
  
  function printBaumTypes() {
    let bauMap = new Map();
    genusMapDb.forEach((outerKey, key) => {
      outerKey.forEach((innerKey, key2) => {
        innerKey.forEach((tree) => {
          let type = 0;
          if (tree.properties.baumtyp != null) {
            type = parseInt(tree.properties.baumtyp);
          }
          if(!bauMap.has(type)){
            bauMap.set(type, tree.properties.baumtyptext);
          } else {
            if (bauMap.get(type) != tree.properties.baumtyptext) {
              console.log("different");
              debugger;
            }
          }
        });
      });
    });
    let text = "BEGIN TRANSACTION;\n";
    let sortedKeys = [...bauMap.keys()].sort(); 
    sortedKeys.forEach( (index) => {
      text += `INSERT INTO BaumType (Id, Name) VALUES (${index}, '${bauMap.get(index)}');`;
    });
    text += "\nCOMMIT;\n";
    console.log(text);
  
  }
  
  function printGenusCodes() {
    let textGenus = "BEGIN TRANSACTION;\n";
    let textType = "BEGIN TRANSACTION;\n";
    let i=1;
    let j=1;
    genusMapDb.forEach((outerKey, key) => {
      textGenus += `INSERT INTO BaumGattungLat (Id, Name, ColorcodeId) VALUES (${i}, '${key}', ${i});`;
      outerKey.forEach((innerKey, key2) => {
        textType += `INSERT INTO BaumArtLat (Id, Name, BaumGattungLatId) VALUES (${j}, '${key2}', ${i});`;
        j++;
      });
      i++;
    });
    textGenus += "\nCOMMIT;\n";
    textType += "\nCOMMIT;\n";
    console.log(textGenus);
    console.log(textType);
  
  }
  
  function printColorCodes() {
    let text = "BEGIN TRANSACTION;\n";
    let i=1;
    const sortedKeys = [...colorsMapDb.keys()].sort(); 
    sortedKeys.forEach( (key) => {
      text += `INSERT INTO BaumArtLat (Name, ColorcodeId, BaumGattungLatId) VALUES ('${key}', ${i}, ${i});`;
      i++;
    });
    text += "\nCOMMIT;\n";
    console.log(text);
  }
  