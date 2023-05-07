// Prunus: Genus, Avium: Species
let bHoldMarkers = false;
let allChecked = false;
let selectedGenusKey = "";
let map = addMap();
let markersLayer = new L.LayerGroup();
let boundsSW = {};
let boundsNE = {};

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

  var locateButton = L.control({position: 'topright'});

  locateButton.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.innerHTML = '<button title="Locate me">locate me</button>';
    div.onclick = function() {
        map.locate({setView: true, maxZoom: 18}); // zoom to current location
    };
    return div;
  };

  locateButton.addTo(map);

  // When the user's location is not found, show an error message
  function onLocationError(e) {
      alert(e.message);
  }

  // Listen for the locationfound and locationerror events
  map.on('locationerror', onLocationError);

  // Handle when the view changes, update northeast and southwest for filter purposes
  map.on('moveend', function() {
    updateMapBounds();
  });

  // var myRenderer = L.svg({ padding: 0.5 });
  // var line = L.polyline( coordinates, { renderer: myRenderer } );
  // var circle = L.circle( center, { renderer: myRenderer } );

  L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 21,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  ).addTo(map);
  return map;
}

function updateMapBounds() {
  var bounds = map.getBounds();
  boundsSW = bounds.getSouthWest();
  boundsNE = bounds.getNorthEast();    
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
    if (selectedGenusKey === "") {
      showTreeCheckboxes(false);
      container.innerHTML = "";
    } else {
      const baumArtLatNames = genusMap[selectedGenusKey].baumArtLatNames;
      let checkboxesHtml = "";
      baumArtLatNames.forEach((elem) => {
        count = elem['count'];
        text = `${elem['baumArtLatName']} (${count})`;
        id = baumArtObjValueKey[elem['baumArtLatName']];
        checkboxesHtml += getCheckboxFor(text, id);
      });
      container.innerHTML = addCheckboxesToForm(checkboxesHtml);
      showTreeCheckboxes(true);
    }
  });
}

let treeCount = 0;
let visibleColors = {};

function updateMarkers(map, markersLayer) {
  if (!bHoldMarkers) {
    visibleColors = {};
    treeCount = 0;
    markersLayer.clearLayers();
  }
  var myRenderer = L.canvas({ padding: 0.5 });
  for (const [outerKey, outerObj] of Object.entries(visibleTrees)) {
    for (const [innerKey, innerObj] of Object.entries(outerObj)) {
      for (const tree of Object.values(innerObj)) {

        treeCount++;

        const baumGattungLat = baumGattungObj[outerKey];
        const baumArtLat = baumArtObj[innerKey];
        const color = colorsObj[outerKey];

        tree['BaumGattungLat'] = baumGattungLat;
        tree['BaumArtLat'] = baumArtLat;
        visibleColors[baumGattungLat] = color;

        const marker = L.circleMarker([parseFloat(tree.lat), parseFloat(tree.lon)], {radius: 3, myData: tree, color: colorsObj[outerKey] })
          .bindPopup(tree.baumname_deu + " " + baumArtObj[innerKey]);
        marker.on('click', async function (e) {
          let tree = e.target.options.myData;
          showTreeInfo(tree);
        });
        markersLayer.addLayer(marker);
      }
    }
  };
  markersLayer.addTo(map);

  document.getElementById('counter').textContent = `${treeCount} tree(s) showing`;

  showColorCodes();
}

function showTreeInfo(treeInfo) {
  let innerHtml = "<table>";
  const fields = ['id', 'poi_id', 'strasse', 'baumname_deu', 'baumname_lat', 'pflanzjahr', 'kronendurchmesser', 'lat', 'lon']
  fields.forEach((field) => {
    innerHtml += `
    <tr>
      <td>${field}</td>
      <td>${treeInfo[field]}</td>
    </tr>
  `;
  });

  // add rest of the fields
  innerHtml += `
  <tr>
    <td>BaumArtLat</td>
    <td>${treeInfo['BaumArtLat']}</td>
  </tr>
  <tr>
    <td>BaumGattungLat</td>
    <td>${treeInfo['BaumGattungLat']}</td>
  </tr>
  <tr>
    <td>Genauigkeit</td>
    <td>${genauigkeitObj[treeInfo['genauigkeit_id']]}</td>
  </tr>
  <tr>
    <td>Status</td>
    <td>${statusObj[treeInfo['status_id']]}</td>
  </tr>
  <tr>
    <td>Status</td>
    <td>${quartierObj[treeInfo['quartier_id']]}</td>
  </tr>
  <tr>
    <td>Kategorie</td>
    <td>${kategorieObj[treeInfo['kategorie_id']]}</td>
  </tr>
  <tr>
    <td>Baumtyp</td>
    <td>${baumTypeObj[treeInfo['baumtyp_id']]}</td>
  </tr>
`;
  innerHtml += '</table>';
  innerHtml += `<a href="https://www.google.com/maps/search/?api=1&query=${treeInfo['lat']},${treeInfo['lon']}" target="_blank">show on Google Maps</td>`;
  document.getElementById("info").innerHTML = innerHtml;
}

function showTreeCheckboxes(bShow) {
  if (bShow) {
    document.getElementById('showTreeCheckboxes').classList.remove('hide');
  } else {
    document.getElementById('showTreeCheckboxes').classList.add('hide');
  }
}

function showColorCodes() {
  let colorbox = document.getElementById("colorbox");
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

  let minPflanzJahr = document.getElementById("pflanzjahr_min").value;
  let maxPflanzJahr = document.getElementById("pflanzjahr_max").value;
  
  let minKronendurchMesser = document.getElementById("kronendurchmesser_min").value;
  let maxKronendurchMesser = document.getElementById("kronendurchmesser_max").value;

  checkboxes.forEach(function (checkbox) {
    if (checkbox.checked) {
      baumArtIds.push(checkbox.value);
    }
  });
  document.getElementById("apply-filter-spinner").classList.remove('hide');
  await getFilteredTrees({ baumArtIds, filterBaumtypValue, filterGenauigkeitValue, filterKategorieValue, filterStatusValue, filterQuartierValue, minPflanzJahr, maxPflanzJahr, minKronendurchMesser, maxKronendurchMesser });
  updateMarkers(map, markersLayer);
  document.getElementById("apply-filter-spinner").classList.add('hide');
}

async function showAllTrees() {
  document.getElementById("all-trees-spinner").classList.remove('hide');
  await getAllTrees();
  updateMarkers(map, markersLayer);
  document.getElementById("all-trees-spinner").classList.add('hide');
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

async function searchByIdClick() {
  var id = document.querySelector('#search-by-id').value;
  getFilteredTrees({id});
  updateMarkers(map, markersLayer);
  // const treeInfo = getTreeById(id);
  // visibleTrees = response.data;
}

function fillDropdown(selectObject, keysObject) {
  // sort the dropdowns by their values
  const sortedKeys = Object.entries(keysObject)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(entry => entry[0]);

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
  const filterForm = document.getElementById("filter-form");
  filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  const filterByIdForm = document.getElementById("search-id-form");
  filterByIdForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchByIdClick();
  });
  

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

  updateMapBounds();
};

main();