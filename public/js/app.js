'use strict';
function showNav() {
    let x = document.getElementById("navDisplay");
    let body = document.getElementsByTagName("body")[0];
    if (x.style.display === "block") {
      x.style.display = "none";
      body.removeAttribute('style');
    } else {
      x.style.display = "block";
      body.setAttribute('style','overflow:hidden');
    }
  }
