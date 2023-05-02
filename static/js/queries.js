var visibleTrees;  // will contain the same structure as genusMap, another map of maps
var genusMap;

let colorsObj;
let statusObj;
let quartierObj;
let kategorieObj;
let genauigkeitObj;
let baumTypeObj;
let baumGattungObj;
let baumArtObj;
let baumArtObjValueKey = {};
let baumGattungObjValueKey = {};

async function getTables() {
  await fetch('/api/tables/all')
  .then(response => response.json())
  .then(response => {
    if (response.success) {
      colorsObj = response.data['colorsObj'];
      statusObj = response.data['statusObj'];
      quartierObj = response.data['quartierObj'];
      kategorieObj = response.data['kategorieObj'];
      genauigkeitObj = response.data['genauigkeitObj'];
      baumTypeObj = response.data['baumTypeObj'];
      baumGattungObj = response.data['baumGattungObj'];
      baumArtObj = response.data['baumArtObj'];
      genusMap = response.data['genusesTypesCounts'];

      for (const key in baumArtObj) {
        value = baumArtObj[key];
        baumArtObjValueKey[value] = key;  
      }

      for (const key in baumGattungObj) {
        value = baumGattungObj[key];
        baumGattungObjValueKey[value] = key;
      }
      
      } else {
        console.error(response.error);
      }
    })
    .catch(error => {
      console.error(error);
    });
}

async function getAllTrees() {
  await fetch('/api/trees/all')
    .then(response => response.json())
    .then(response => {
      if (response.success) {
        visibleTrees = response.data;
      } else {
        console.error(data.error);
      }
    })
    .catch(error => {
      console.error(error);
    });
}

function addQueryParam(queryParameters, key, value) {
  if (value !== null) {
    queryParameters[key] = value;
  }
}

async function getTrees({baumGattunIds = null,
   baumArtIds = null,
    filterBaumtypValue = null, 
    filterGenauigkeitValue = null,
     filterStatusValue = null, 
     filterQuartierValue = null, 
     filterKategorieValue = null}) {
  let queryParameters = {};

  if (baumGattunIds !== null) {
    queryParameters.baumGattunIds = baumGattunIds;
  }

  if (baumArtIds !== null) {
    queryParameters.baumArtIds = baumArtIds;
  }
  
  addQueryParam(queryParameters, 'baumtyp', filterBaumtypValue);
  addQueryParam(queryParameters, 'genauigkeit', filterGenauigkeitValue);
  addQueryParam(queryParameters, 'status', filterStatusValue);
  addQueryParam(queryParameters, 'quartier', filterQuartierValue);
  addQueryParam(queryParameters, 'kategorie', filterKategorieValue);

  // Construct query string from query parameters
  let queryString = '';
  for (let key in queryParameters) {
    queryString += `&${key}=${encodeURIComponent(queryParameters[key])}`;
  }
  queryString = queryString.substr(1);
  await fetch(`/api/trees?${queryString}`)
    .then(response => response.json())
    .then(response => {
      if (response.success) {
        visibleTrees = response.data;
      } else {
        console.error(data.error);
      }
    })
    .catch(error => {
      console.error(error);
    });
  return;
  let baumGattunIdsStrs = baumGattunIds.join(',')
  let baumArtIdsStr = baumArtIds.join(',')
  await fetch('/api/trees?baumGattunIds=' + baumGattunIdsStrs + '&baumArtIds='+ baumArtIdsStr)
    .then(response => response.json())
    .then(response => {
      if (response.success) {
        visibleTrees = response.data;
      } else {
        console.error(data.error);
      }
    })
    .catch(error => {
      console.error(error);
    });
}