// Prunus: Genus, Avium: Species
let bHoldMarkers = false;
let allChecked = false;
let selectedGenusKey = "";
let map = addMap();
let markersLayer = new L.LayerGroup();

function holdMarkers(checkbox) {
  bHoldMarkers = checkbox.checked;
}

function checkAll(button) {
  allChecked = !allChecked;   // default allChecked is false
  button.textContent = allChecked ? "Check all" : "Uncheck all";
  const container = document.getElementById("checkbox-container");
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(function (checkbox) {
    checkbox.checked = !allChecked;
  });
}

function clearVisibleTrees() {
  for (let [outerKey, innerMap] of visibleTrees) {
    for (let innerKey of innerMap.keys()) {
      innerMap.set(innerKey, undefined);
      innerMap.delete(innerKey);
    }
    visibleTrees.delete(outerKey);
  }
  visibleTrees.clear();
}

function addMap() {
  const map = L.map("map").setView([47.3579481, 8.5035171], 12);
  // var myRenderer = L.svg({ padding: 0.5 });
  // var line = L.polyline( coordinates, { renderer: myRenderer } );
  // var circle = L.circle( center, { renderer: myRenderer } );

  L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  ).addTo(map);
  return map;
}

function addToVisibleTrees(genusKey, speciesKey) {
  if (!visibleTrees.has(genusKey)) {
    visibleTrees.set(genusKey, new Map());
  }

  const genuses = genusMap.get(genusKey);

  if (speciesKey) {
    // add subtypes only
    const species = genuses.get(speciesKey);
    if (!species) {
      console.log("no such tree type found: " + speciesKey);
      return;
    }
    let visibleGenuses = visibleTrees.get(genusKey);
    if (!visibleGenuses.has(speciesKey)) {
      visibleGenuses.set(speciesKey, [])
    }
    visibleTrees.get(genusKey).set(speciesKey, [...species]);  // copy the trees array from species into visible trees

  } else {
    // show all Acer trees
    visibleTrees.set(genusKey, new Map(genuses));
  }

}

function fillDropDownWithTrees() {
  const treeTypeSelect = document.getElementById("tree-type");
  const sortedKeys = [...Object.keys(genusMap)].sort();
  sortedKeys.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.text = key;
    treeTypeSelect.add(option);
  });

  treeTypeSelect.addEventListener('change', function () {
    // if (!bHoldMarkers) clearVisibleTrees();
    selectedGenusKey = this.value;
    const container = document.getElementById("checkbox-container");
    const baumArtLatNames = genusMap[selectedGenusKey].baumArtLatNames;
    let checkboxesHtml = "";
    baumArtLatNames.forEach((elem) => {
      count = elem['count'];
      text = `${elem['baumArtLatName']} (${count})`;
      id = baumArtObjValueKey[elem['baumArtLatName']];
      checkboxesHtml += getCheckboxFor(text, id);
    });
    container.innerHTML = addCheckboxesToForm(checkboxesHtml);
  });
}


let visibleColors = new Map();
function updateMarkers(map, markersLayer) {
  let treeCount = 0;
  if (!bHoldMarkers) markersLayer.clearLayers();
  var myRenderer = L.canvas({ padding: 0.5 });
  for (const [outerKey, outerObj] of Object.entries(visibleTrees)) {
    for (const [innerKey, innerObj] of Object.entries(outerObj)) {
      for (tree of Object.entries(innerObj)) {
        treeCount++;
        tree = tree[1]; // why php puts the index as first element of the array?!
        tree['BaumGattungLat'] = baumGattungObj[outerKey];
        tree['BaumArtLat'] = baumArtObj[innerKey];

        var marker = L.circleMarker([parseFloat(tree.lat), parseFloat(tree.lon)], { renderer: myRenderer, radius: 3, myData: tree, color: colorsObj[outerKey] })
          .bindPopup(tree.baumname_deu + " " + baumArtObj[innerKey]);
        marker.on('click', function (e) {
          let innerHtml = "<table>";
          let tree = e.target.options.myData;

          const fields = ['id', 'poi_id', 'strasse', 'baumname_deu', 'baumname_lat', 'pflanzjahr', 'kronendurchmesser', 'lat', 'lon']
          fields.forEach((field) => {
            innerHtml += `
            <tr>
              <td>${field}</td>
              <td>${tree[field]}</td>
            </tr>
          `;
          });

          // add rest of the fields
          innerHtml += `
          <tr>
            <td>BaumArtLat</td>
            <td>${tree['BaumArtLat'] }</td>
          </tr>
          <tr>
            <td>BaumGattungLat</td>
            <td>${tree['BaumGattungLat']}</td>
          </tr>
          <tr>
            <td>Genauigkeit</td>
            <td>${genauigkeitObj[tree['genauigkeit_id']]}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td>${statusObj[tree['status_id']]}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td>${quartierObj[tree['quartier_id']]}</td>
          </tr>
          <tr>
            <td>Kategorie</td>
            <td>${kategorieObj[tree['kategorie_id']]}</td>
          </tr>
          <tr>
            <td>Baumtyp</td>
            <td>${baumTypeObj[tree['baumtyp_id']]}</td>
          </tr>
        `;
          innerHtml += '</table>';
          innerHtml += `<a href="https://www.google.com/maps/search/?api=1&query=${tree['lat']},${tree['lon']}" target="_blank">show on Google Maps</td>`;
          document.getElementById("info").innerHTML = innerHtml;
        })
        markersLayer.addLayer(marker);
      };
    };
  };
  markersLayer.addTo(map);
  document.getElementById("counter").textContent = treeCount.toString() + " tree(s) showing";
  showColorCodes();
}

function showColorCodes() {
  let container = document.getElementById("colorbox");
  colorbox.innerHTML = "";
  const sortedKeys = [...Object.keys(visibleColors)].sort();
  sortedKeys.forEach((key) => {
    let colorCode = visibleColors[key];
    colorbox.innerHTML += `
    <div class="col-md-2">
      <div class="marker">
        <div class="circle" style="background-color: ${colorCode};"></div>
        <span class="label">${key}</span>
      </div>
    </div>
      `
  });
}

async function applyFilters() {
  baumArtIds = []
  const container = document.getElementById("checkbox-container");
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  
  checkboxes.forEach(function (checkbox) {
    if (checkbox.checked) {
      baumArtIds.push(checkbox.value);
    }
  });

  await getTrees({baumArtIds, filterBaumtypValue, filterGenauigkeitValue, filterKategorieValue, filterStatusValue, filterQuartierValue});
  updateMarkers(map, markersLayer);
}

function showHideSpecies(checkbox) {
  if (checkbox.checked) {
    addToVisibleTrees(selectedGenusKey, checkbox.value);
  } else {
    removeFromVisibleTrees(selectedGenusKey, checkbox.value);
  }
}

function removeFromVisibleTrees(genusKey, speciesKey) {
  visibleTrees.get(genusKey).set(speciesKey, []);
}

function showAllFruitTrees(checkbox) {
  let obstTrees = new Map();
  visibleTrees.forEach((outerMap, outerKey) => {
    outerMap.forEach((innerMap, innerKey) => {
      let originalTrees = visibleTrees.get(outerKey).get(innerKey);
      originalTrees.forEach((tree) => {
        if (tree.properties.baumtyp == "6") {
          if (!obstTrees.has(outerKey)) {
            obstTrees.set(outerKey, new Map());
          }
          if (!obstTrees.get(outerKey).has(innerKey)) {
            obstTrees.get(outerKey).set(innerKey, []);
          }
          let trees = obstTrees.get(outerKey).get(innerKey);
          trees.push(tree);
          obstTrees.get(outerKey).set(innerKey, trees);
        }
      });
    });
  });
  // obstTrees = new Map([...visibleTrees.entries()].map(([outerKey, innerMap]) => {
  //   const filteredInnerMap = new Map([...innerMap.entries()].map(([innerKey, array]) => {
  //     const filteredArray = array.filter((item) => item.properties.baumtyp == "6");
  //     return [innerKey, filteredArray];
  //   }));
  //   return [outerKey, filteredInnerMap];
  // }));
  visibleTrees = obstTrees;
  showColorCodes();
  updateMarkers(map, markersLayer);
}

function showAllTrees() {
  for (const [key, innerMap] of genusMap) {
    const destInnerMap = new Map(innerMap);
    visibleTrees.set(key, destInnerMap);
  }
  updateMarkers(map, markersLayer);
}

function getCheckboxFor(key, value) {
  return `
  <div class="col-md-8">
    <label class="checkbox-inline">
      <input type="checkbox" name="tree_type" value="${value}" checked=true"> ${key}
      </label>
      </div>
      `;
      // <input type="checkbox" name="tree_type" value="${value}" checked=true onclick="showHideSpecies(this)"> ${value}
}

function addCheckboxesToForm(checkboxes) {
  return `
    <div class="col-md-12">
      <div class="form-group">
        ${checkboxes}
      </div>
    </div>
    `
}

function showTreesOfKind(map, markersLayer, prunusMap) {
  markersLayer.clearLayers();
  var myRenderer = L.canvas({ padding: 0.5 });
  prunusMap.forEach(trees => {
    trees.forEach(tree => {
      let long = tree.geometry.coordinates[0];
      let lat = tree.geometry.coordinates[1];
      var marker = L.circleMarker([lat, long], { renderer: myRenderer, radius: 3, myData: tree })
        .bindPopup(tree.properties.baumnamedeu + " " + tree.properties.baumartlat);
      marker.on('click', function (e) {
        let innerHtml = "<table>";
        let data = e.target.options.myData.properties;
        Object.keys(data).forEach((key) => {
          const value = data[key];
          innerHtml += `
          <tr>
            <td>${key}</td>
            <td>${value}</td>
          </tr>
        `;
        });
        innerHtml += '</table>';
        document.getElementById("info").innerHTML = innerHtml;
      })
      markersLayer.addLayer(marker);
    });
    markersLayer.addTo(map);
  })
}

async function searchById() {
  var id = document.querySelector('#search-by-id').value;
  // Do something with the treeId value
  await fetch(`/api/trees/id/${id}`)
    .then(response => response.json())
    .then(response => {
      if (response.success) {
        visibleTrees = response.data;
        updateMarkers(map, markersLayer);
      } else {
        console.error(data.error);
      }
    })
    .catch(error => {
      console.error(error);
    });
}

async function searchByPoiId() {
  var id = document.querySelector('#search-by-poiid').value;
  // Do something with the treeId value
  await fetch(`/api/trees/poiid/${id}`)
    .then(response => response.json())
    .then(response => {
      if (response.success) {
        visibleTrees = response.data;
        updateMarkers(map, markersLayer);
      } else {
        console.error(data.error);
      }
    })
    .catch(error => {
      console.error(error);
    });
}

function fillDropdown(selectObject, keysObject){
  // sort the dropdowns by their values
  const sortedKeys = Object.entries(keysObject)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(entry => entry[0]);

  // const obj = { a: 3, b: 1, c: 2 };
  // const sortedKeys = Object.entries(obj)
  // .sort((a, b) => a[1] - b[1])
  // .map(entry => entry[0]);

  console.log(sortedKeys); 

  for (key in sortedKeys) {
    let realkey = sortedKeys[key];
    value = keysObject[realkey];
    const option = document.createElement("option");
    option.value = realkey;
    option.text = value;
    selectObject.add(option);
  }
}

let filterBaumtypValue = "";
let filterGenauigkeitValue = "";
let filterKategorieValue = "";
let filterStatusValue = "";
let filterQuartierValue = "";

async function main() {
  await getTables();

  const baumtypDropdown = document.getElementById('baumtyp');
  const genauigkeitDropdown = document.getElementById('genauigkeit');
  const kategorieDropdown = document.getElementById('kategorie');
  const statusDropdown = document.getElementById('status');
  const quartierDropdown = document.getElementById('quartier');

  fillDropDownWithTrees(map, markersLayer)
  fillDropdown(baumtypDropdown, baumTypeObj);
  fillDropdown(genauigkeitDropdown, genauigkeitObj);
  fillDropdown(kategorieDropdown, kategorieObj);
  fillDropdown(statusDropdown, statusObj);
  fillDropdown(quartierDropdown, quartierObj);

  baumtypDropdown.addEventListener('change', filterData);
  genauigkeitDropdown.addEventListener('change', filterData);
  kategorieDropdown.addEventListener('change', filterData);
  statusDropdown.addEventListener('change', filterData);
  quartierDropdown.addEventListener('change', filterData);

  // Define the filterData function
  function filterData() {
    // Get the selected values from the dropdowns
    filterBaumtypValue = baumtypDropdown.value;
    filterGenauigkeitValue = genauigkeitDropdown.value;
    filterKategorieValue = kategorieDropdown.value;
    filterStatusValue = statusDropdown.value;
    filterQuartierValue = quartierDropdown.value;
    // Send the selected values to the server to filter the data
    // using your AJAX or fetch function
  }

  // await getAllTrees();
  if (false) {
    let futureFeatures = getTreeData();
    let features = await futureFeatures;
    parseData(features);
  }
  // addToVisibleTrees("Prunus", null);
  // updateMarkers(map, markersLayer);
  // showTreesOfKind(map, markersLayer, genusMap.get("Prunus"));
};

main();

// fetch('tree.json')
//   .then(response => response.json())
//   .then(data => {
//     // Access the "features" array
//     const features = data.features;
//     for (const feat of features) {
//       const objs = genusMap.get(feat.baumgattunglat);
//       objs.push({
//         "coordinates": feat.coordinates,
//         "objid": feat.objid,
//         "strasse": feat.strasse,
//         "baumartlat": feat.baumartlat,
//         "baumnamelat": feat.baumnamelat,
//         "baumtyp": feat.baumtyp,
//         "kronendurchmesser": feat.kronendurchmesser,
//         "baumtyptext": feat.baumtyptext,
//         "baumnamedeu": feat.baumnamedeu    
//     })
//       genusMap.set(feat.baumgattunglat, [{}, {}, {}]);
//     }
//     console.log(features[0]);
//   })
//   .catch(error => console.error(error));
