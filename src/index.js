const axios = require('axios');
import renderSunburst from './d3';
import * as d3 from "d3";


document.addEventListener('DOMContentLoaded', () => {

  let nodeData = {
    name: "",
    children: [
    {
      name: "Info",
      children: [{ "name": "Premiere Date", "children": []}, {"name": "Rating", "children": []}, {"name": "Runtime", "children": []}, {"name": "Network", "children": []},
      {"name": "Genres", "children": []}]
    },
    {
      name: "Seasons",
      children: []
    },
    {
      name: "Cast",
      children: []
    },
    {
      name: "Crew",
      children: []
    }
    ]
  };

  const clearChart = () => {
    let svgEl = d3.select("svg");
    svgEl.selectAll("*").remove();
  };

  const render404Errors = () => {
    let errors = document.getElementsByTagName("div")[13];
    errors.className = 'errors';
    errors.textContent = "Invalid Show";
    errors.style.fontWeight = "bold";
    errors.style.fontStyle = "strong";
  };

  const render429Errors = () => {
    let errors = document.getElementsByTagName("div")[13];
    errors.className = 'errors';
    errors.textContent = "Please Try Again";
    errors.style.fontWeight = "bold";
    errors.style.fontStyle = "strong";
  };

  const clearErrors = () => {
    let divElement = document.getElementsByTagName("div")[13];
    divElement.textContent = "";
  };

  const checkUrl = (url) => {
    const http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    
    if (http.status === 404) {
      render404Errors();
    } else if (http.status === 429) {
      render429Errors();
    } else {
      clearErrors();
    }
  };

  const showErrors = (error) => {
    let errors = document.getElementsByTagName("div")[13];
    errors.className = "errors";
    errors.textContent = error;
    errors.style.fontWeight = "bold";
    errors.style.fontStyle = "strong";
  }
  
  const getShow = async () => {
    clearChart();

    let loader = document.getElementsByTagName("div")[13];
    loader.className = 'loader';

    const userInput = document.getElementById("showTitle").value;
    nodeData.name = userInput;

    let url = `https://api.tvmaze.com/singlesearch/shows/?q=${userInput}`;
    checkUrl(url);

    const response = await axios.get(url)
    .catch(error => {
      showErrors(error);
    }); 

    let showId = response.data.id;

    for (let a = 0; a < nodeData.children.length; a++) {
      let child = nodeData.children[a];
      if (child.name === "Info") {
        for (let b = 0; b < child.children.length; b++) {
          let innerChild = child.children[b];
          if (innerChild.name === "Premiere Date") {
            let premierNode = { "name": response.data.premiered, "size": 1};
            innerChild.children.push(premierNode);
          } else if (innerChild.name === "Rating") {
            let ratingNode = { "name": `${response.data.rating.average}`, "size": 1};
            innerChild.children.push(ratingNode);
          } else if (innerChild.name === "Runtime") {
            let runtimeNode = { "name": `${response.data.runtime}`, "size": 1};
            innerChild.children.push(runtimeNode);
          } else if (innerChild.name === "Network") {
            if (response.data.network) {
              let networkNode = { "name": response.data.network.name, "size": 1};
              innerChild.children.push(networkNode);
            } else if (response.data.webChannel.name) {
              let networkNode = { "name": response.data.webChannel.name, "size": 1 };
              innerChild.children.push(networkNode);
            }
          } else if (innerChild.name === "Genres") {
            for (let c = 0; c < response.data.genres.length; c++) {
              let genre = response.data.genres[c];
              let genreNode = {"name": genre, "size": 1};
              innerChild.children.push(genreNode);
            }
          }
        }
      } else if (child.name === "Seasons") {
        url = `https://api.tvmaze.com/shows/${showId}/seasons`;
        checkUrl(url);

        const seasons = await axios.get(url).catch(error => {
          showErrors(error);
        });   //get seasons

        for (let i = 0; i < seasons.data.length; i++) {
          let seasonId = seasons.data[i].id;

          url = `https://api.tvmaze.com/seasons/${seasonId}/episodes`;
          checkUrl(url);

          const episodes = await axios.get(url).catch(error => {
            showErrors(error);
          });
          child.children.push(episodes.data);
        }
     
      } else if (child.name === "Cast") {
        url = `https://api.tvmaze.com/shows/${showId}/cast`;
        checkUrl(url);

        const cast = await axios.get(url).catch(error => {
          showErrors(error);
        });

        child.children = cast.data;
      } else if (child.name === "Crew") {
        url = `https://api.tvmaze.com/shows/${showId}/crew`;
        checkUrl(url);

        const crew = await axios.get(url).catch(error => {
          showErrors(error);
        });

        child.children = crew.data;
      }
    }

    for(let it = 0; it < nodeData.children.length; it++) {    //format seasons with children nodes 
      let child = nodeData.children[it];

      if(child.name === "Seasons") {
        let seasonsChildren = [];

        for(let e = 0; e < child.children.length; e++) {
          let episodes = child.children[e];
          let epChild = {"name": `Season ${e + 1}`, "children": []};

          for(let l = 0; l < episodes.length; l++) {
            let ep = episodes[l];
            let epName = ep.name;

            let epNode = {"value": `Episode ${l + 1}`, "name": epName, "size": 1};
            epChild.children.push(epNode);
          }

          seasonsChildren.push(epChild);
        }
        child.children = seasonsChildren;
        
      } else if(child.name === "Cast") {
        let castChildren = [];

        for(let f = 0; f < child.children.length; f++) {
          let char = child.children[f];
          let personId = char.person.id;
          let charChild = { "name": char.person.name, "character": char.character.name, "children": [] };

          url = `https://api.tvmaze.com/people/${personId}/castcredits`;
          checkUrl(url);

          const otherShows = await axios.get(url).catch(error => {showErrors(error);});
          for(let g = 0; g < otherShows.data.length; g++) {
            let charCredit = otherShows.data[g];
            let showUrl = charCredit._links.show.href;

            checkUrl(showUrl);

            const show = await axios.get(showUrl).catch(error => {showErrors(error);});
            const showName = show.data.name;
            let showNode = {"name": showName, "size": 1};
            charChild.children.push(showNode);
          }
          castChildren.push(charChild);
        }
        child.children = castChildren;
      } else if(child.name === "Crew") {
          let crewChildren = [];

          for(let z = 0; z < child.children.length; z++) {
            let crewMember = child.children[z];
            let role = crewMember.type;
            let name = crewMember.person.name;

            let roleNode = {"name": role, "children": []};
            crewChildren.push(roleNode);
            let crewNode = {"name": name, "size": 1};
            roleNode.children.push(crewNode);
          }

        child.children = crewChildren;
      }
    }

    renderSunburst(nodeData);
  };

  const showButton = document.getElementById("findShow");
  const inputBox = document.getElementById('showTitle');
  
  showButton.onclick = clearChart();
  
  inputBox.addEventListener("keyup", function(e) {
    if(e.keyCode === 13) {
      e.preventDefault();
      document.getElementById("findShow").click();
    }
  });

  showButton.addEventListener("click", getShow);

});


