// ==UserScript==
// @name         IngressMosaik Export Text Script
// @namespace    http://tampermonkey.net/
// @version      0.2.4
// @description  Export IngressMosaik mission list as text script
// @author       sspp0000xx
// @downloadURL  https://github.com/sp00x/tampermonkey-ingressmosaik-export-mission-text-script/raw/master/ingressmosaik-export-text-script.user.js
// @match        https://ingressmosaik.com/mosaic/*
// @include      https://ingressmosaik.com/mosaic/*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    let types = {
        1: 'hack',
        2: 'capture/upgrade',
        3: 'create link',
        4: 'create field?(4)', // unverified
        5: 'install mod',
        6: '???(6)',
        7: 'visit waypoint',
        8: 'answer question'
    };

    function nodelistToArray(list) {
        let items = [];
        for (let i = 0; list.length > i; i++) {
            items.push(list[i]);
        }
        return items;
    }

    function dumpMissionsFromTable() {

        let missions = nodelistToArray(document.querySelectorAll("tbody tr")).map(m => {
            let cells = m.querySelectorAll("td");
            return {
                name: cells[2].innerText,
                description: cells[cells.length-3].innerText,
                actions: nodelistToArray(cells[cells.length-2].querySelectorAll("span"))
                .filter(n => n.innerText != "")
                .splice(2)
                .map(n => n.innerText.trim() + ': ' + n.title.trim())
            }
        });
        return missions;
    }

    function dumpMissionsFromJson() {
        let missions = lang_txt_M[4][0].map(mission => {
            let actions = mission.data.waypoints.map(w => {
                return {
                    type: w.data[0],
					action: types[w.data[0]] || "???" + w.data[0],
                    name: w.data[1],
                    lat: w.latLng[0],
                    lng: w.latLng[1]
                }
            })
            return {
                name: mission.data.dap,
                guid: mission.data.guid,
                image: mission.data.image,
                actions
            }
        })
        return missions;
    }

    function makeGoogleDirectionsLink(m) {
        console.log("steps = " + m.actions.length);
        let u = "https://www.google.com/maps/dir/?api=1&travelmode=walking";
        let a = [ ...m.actions ];
        let first = a.shift();
        let last = a.pop();
        u += "&origin=" + first.lat + "," + first.lng;
        u += "&waypoints=" + a.map(aa => aa.lat + "," + aa.lng).join("|");
        u += "&destination=" + last.lat + "," + last.lng;
        return u;
    }

    function getMissions() {
        let tableMissions = dumpMissionsFromTable();
        console.log("missions from table", tableMissions);

        let jsonMissions = dumpMissionsFromJson();
        console.log("missions from json", jsonMissions);

        let missions = jsonMissions.map((m,i) => {
            m.description = tableMissions[i].description;
            m.directions = [];
            const maxWaypoints = 10;
            console.log("#", m.actions.length);
            for (let j = 1; m.actions.length >= j; j += maxWaypoints) {
                let from = j;
                let to = Math.min(j + maxWaypoints, m.actions.length);
                console.log(from, to);
                if (to > from) {
                    m.directions.push({
                        title: `${from}-${to}`,
                        url: makeGoogleDirectionsLink({ actions: m.actions.slice(from-1, to) })
                    })
                }
            }
            return m;
        });

        return missions;
    }

    function ready() {
        GM_registerMenuCommand("IngressMosaik: Append text script", () => {
            let missions = getMissions();

            let allActions = missions.reduce((all,m) => ([ ...all, ...m.actions ]), []);
            let allDirectionsLink = makeGoogleDirectionsLink({ actions: allActions });

            let source = `
<div class="dump">
<!--<p><a href="{{directionsUrl}}">Directions (complete banner, {{numActions}} actions)</a></p>-->
{{#each missions}}
  <h3>{{name}}</h1>
  <p>{{description}} (Directions:{{#each directions}} <a href="{{url}}">{{title}}</a>{{/each}})</p>
  <ol>
{{#each actions}}
    <li><a href="https://intel.ingress.com/intel?ll={{lat}},{{lng}}&pll={{lat}},{{lng}}&z=16">{{name}}</a> ({{action}})</li>
{{/each}}
  </ol>
{{/each}}
</div>
`;
            let tpl = Handlebars.compile(source);
            let html = tpl({ missions: missions, directionsUrl: allDirectionsLink, numActions: allActions.length });
            let div = document.createElement("div");
            div.innerHTML = html;
            document.body.appendChild(div);
            GM_notification({ text: 'Mission script appended at the bottom of the page' })
        });

        GM_registerMenuCommand("IngressMosaik: Copy data to clipboard", () => {
            let missions = getMissions();
            GM_setClipboard(JSON.stringify(missions), "text");
            GM_notification({ text: 'Mission JSON data copied to clipboard' })
        })
    }

    console.log("loading handlebars..");
    var script = document.createElement("script");
    script.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.12/handlebars.min.js");
    script.addEventListener('load', function() {
        console.log("handlebars loaded");
        ready();
    }, false);
    document.body.appendChild(script);


})();