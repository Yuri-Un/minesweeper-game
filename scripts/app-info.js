//Global constants
const appInfo ={
    version: '1.0',
    license: 'GPLv2',
    type: 'Web App',
    author: 'Yuri Un',
    localization: 'En'
};

const menu = document.querySelector('#about-menu');
const versionElems = document.getElementsByClassName('app-version');
const licenseElems = document.getElementsByClassName('app-license');
const typeElems = document.getElementsByClassName('app-type');
const authorElems = document.getElementsByClassName('app-author');
const localElems = document.getElementsByClassName('app-local');

menu.addEventListener('click', menuHandler, false);


//App functions
[...versionElems].forEach((elem) => {
    elem.innerText = appInfo.version;
});

[...licenseElems].forEach((elem) => {
    elem.innerText = appInfo.license;
});

[...typeElems].forEach((elem) => {
    elem.innerText = appInfo.type;
});

[...authorElems].forEach((elem) => {
    elem.innerText = appInfo.author;
});

[...localElems].forEach((elem) => {
    elem.innerText = appInfo.localization;
});


//Event handlers
function menuHandler(e){
    location.assign('../index.html');
}


