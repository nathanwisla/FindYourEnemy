/**
 * @name main.js
 * @purpose To learn the fundamentals of the Leaflet API and to build a less simple mapping application
 * @author Nathan Wisla
 * @date March 12, 2021
 */

'use strict';

let m = {}, //DOM and HTML related objects
    leaflet = {}; //Leaflet related objects

window.onload = () => {
    let
        clickCoords = m.el('#click'),
        mousePos = m.el('#mouse-position'),
        welcomeMsg = m.el('#get-started'),
        pointLongLat = [53.533727, -113.506616],
        // geojson to be parsed from a separate file: its layer name, its label, and its style
        geoJSON = [
            {name: 'Edmonton Parks', attr: 'offname', src: 'json/EdmontonParks.geojson', style: {color: 'green'}},
            {name: 'Edmonton Roads', attr: 'name_ab', src: 'json/EdmontonRoads.geojson', style: {color: 'purple'}}
        ],
        marker = {'Enemies': leaflet.setMarkers(pointLongLat)},
        basemapTiles = leaflet.setBasemapLayers(),


        map = leaflet.setMap(pointLongLat, 11, basemapTiles.Stadia_AlidadeSmooth);

    // Start a recursive XMLhttprequest to set all controls and geometries
    leaflet.setAllControls(geoJSON, [marker], basemapTiles, map);

    // Add a scale bar
    leaflet.setScaleBar(100,'bottomright').addTo(map);


    // ================================EVENT LISTENERS==================================================================

    map.on('mousemove', e => {
        mousePos.innerHTML = leaflet.getEventCoordinates(e, 2);
    });


    map.on('click', e => {
        m.hide(welcomeMsg);
        clickCoords.innerHTML = leaflet.getEventCoordinates(e, 2);


        if (m.userInput != undefined) {
            map.removeLayer(m.userInput);
        }

        m.userInput = L.marker(e.latlng).addTo(map).bindPopup('Possible Enemy Location');
    });


    // Hide the getting started message after 10 seconds
    window.setTimeout(() => m.hide(welcomeMsg), 10000);
}


//==================================MAP LAYER METHODS===================================================================


/**
 * Gets the coordinates of a map event, and returns a string of the lat/long pair
 * @param obj
 * @param decimalPlaces
 * @returns {string}
 */
leaflet.getEventCoordinates = function (obj, decimalPlaces) {
    return `${obj.latlng.lat.toFixed(decimalPlaces)}, ${obj.latlng.lng.toFixed(decimalPlaces)}`
}


/**
 * Sets all geometries, parses JSON recursively if necessary. Everything in this method is automatically parsed
 * within nested XMLHttpRequests.
 * @author Nathan Wisla
 * @param objects {Object[]} A list of objects that define a geoJSON layer in order to parse it.
 *        format: {name: name of layer, attr: name of attribute to be labeled , src: json source, style: css vector style}
 * @param preparsedFeatures {Object[]} A list of features that have been made outside of JSON parsing (pre-parsed)
 * @param tiles {Object} All basemap tiles to go into the map
 * @param map {L.map} A leaflet map object
 * @returns {*}
 */
leaflet.setAllControls = function (objects, preparsedFeatures, tiles, map) {

    let xhttp = new XMLHttpRequest(),
        /**
         * @param i
         * @param req {XMLHttpRequest}
         * @param objects
         */
        recursivexhttp = (i, req, objects) => {


            if (i == objects.length) {
                let features = [],
                    pusher = item => features.push(item);

                // make a list of all geometries, defaults AND parsed-geojson
                preparsedFeatures.forEach(pusher);
                objects.forEach(pusher);


                let featurelayers = leaflet.setFeatureLayers(features);
                L.control.layers(tiles, featurelayers).addTo(map);

                return features;

            } else {

                req.open('GET', objects[i].src);
                req.send();
                req.onload = () => {
                    let json = JSON.parse(req.response),
                        leafletGeom = {};

                    leafletGeom[objects[i].name] = leaflet.setGeoJson(json, objects[i].attr, objects[i].style);
                    objects[i] = leafletGeom;


                    return recursivexhttp(i + 1, req, objects);
                }
            }
        }

    return recursivexhttp(0, xhttp, objects);
}


/**
 * Initializes a basemap layer
 * @returns {Object}
 */
leaflet.setBasemapLayers = function () {
    return {

        Stadia_AlidadeSmooth: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        }),

        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
    }
}


/**
 *
 * @param layerGroups{Object[]} A list of layers and their names
 * @returns {Object} All of the objects parsed
 */
leaflet.setFeatureLayers = function (layerGroups) {
    let layersObject = {};

    for (const obj of layerGroups) {
        for (const [key, value] of Object.entries(obj)) {

            layersObject[key] = value;
        }


    }

    return layersObject;
}


/**
 * Sets the geometry and labeling of a geoJSON input
 * @param json {Object} the json object
 * @param labelAttr {string} the attribute name of the label you want to place
 * @param style {Object} a CSS vector style
 * @returns {L.geoJSON} a geoJSON object
 */
leaflet.setGeoJson = function (json, labelAttr,style) {
    return L.geoJSON(json, {
        style: style,
        onEachFeature: (feature, layer) => {
            layer.bindPopup(feature.properties[labelAttr] == null ? 'Unnamed' : feature.properties[labelAttr]);
        }
    });

}


/**
 * Initializes a map, defines a center, zoom level, and basemaps
 * @param defaultCenterLatLong {float[]}
 * @param zoomLevel {float}
 * @param basemaps {Object}
 * @returns {L.map}
 */
leaflet.setMap = function (defaultCenterLatLong, zoomLevel, basemap) {
    return L.map('map', {
            center: defaultCenterLatLong,
            zoom: zoomLevel,
            layers: basemap
        }
    );

}


/**
 * Sets a vector source as a point feature
 * @param latLongPairs {float[]} Long/Lat coordinate pairs to be turned into features
 * @returns {L.layerGroup}
 */
leaflet.setMarkers = function (...latLongPairs) {

    let markers = [];

    for (const i in latLongPairs) {
        markers.push(
            new L.marker(latLongPairs[i]).bindPopup('An enemy lives here.')
        );
    }

    return L.layerGroup(markers);
}

/**
 *
 * @param width {int} The maximum width
 * @param position {string} a string that defines where the scalebar goes
 * @returns {L.control.scale}
 */
leaflet.setScaleBar = function (width, position) {
    return L.control.scale({
        maxWidth: width,
        imperial: false,
        position: position
    });
}

//==================================GENERAL DOM METHODS=================================================================


/**
 * Replaces document.querySelector() for brevity
 * @param query
 * @returns {Element}
 */
m.el = function (query) {
    return document.querySelector(query);
}


/**
 * Hides an element by adding the bootstrap class 'd-none' to the element
 * @param el {Element} html element to be hidden in bootstrap
 */
m.hide = function (el) {
    if (!el.className.includes('d-none')) {
        el.className += ' slide-up'
    }

    window.setTimeout(() => el.className += ' d-none', 500);

}
