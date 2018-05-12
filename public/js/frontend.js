function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName('tabcontent');
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none';
  }
  const tablinks = document.getElementsByClassName('tablinks');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '');
  }
  document.getElementById(tabName).style.display = 'block';
  evt.currentTarget.className += ' active';
}

function download(name, type) {
  const a = document.getElementById('downloadAnchor');
  const ical = document.getElementById('ical').textContent;
  const file = new Blob([ical], { type });
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
}
