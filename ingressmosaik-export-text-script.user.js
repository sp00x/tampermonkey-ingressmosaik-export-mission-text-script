// ==UserScript==
// @name         IngressMosaik Export Text Script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Export IngressMosaik mission list as text script
// @author       sspp0000xx
// @match        https://ingressmosaik.com/mosaic/*
// @include      https://ingressmosaik.com/mosaic/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function nodelistToArray(list) {
        let items = [];
        for (let i = 0; list.length > i; i++) {
            items.push(list[i]);
        }
        return items;
    }

    function dumpMissions() {

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

        let text = missions.reduce((v,c) => v + "#### " + c.name + " ####\n\n" + c.actions.join("\n") + "\n\n", "")
        //console.log(text);

        let pre = document.createElement("pre");
        pre.appendChild(document.createTextNode(text));
        document.body.appendChild(pre);
    }

    dumpMissions();

})();