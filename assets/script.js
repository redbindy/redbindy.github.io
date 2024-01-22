function toggleToc() {
  const toc = document.getElementById('toc');
  toc.style.display = (toc.style.display === 'none' || toc.style.display === '') ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  const toc = document.getElementById('toc');
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let tocLevels = [toc];

  headings.forEach(function (heading, index) {
    const headingId = heading.id || `toc-heading-${index + 1}`;
    heading.id = headingId;

    const headingText = heading.textContent || heading.innerText;
    const level = index === 0 ? 1 : parseInt(heading.tagName.charAt(1));

    const li = document.createElement('li');
    const tocLink = document.createElement('a');
    tocLink.href = `#${headingId}`;
    tocLink.textContent = headingText;

    li.appendChild(tocLink);

    while (level <= tocLevels.length) {
      tocLevels.pop();
    }

    if (tocLevels.length > 0) {
      tocLevels[tocLevels.length - 1].appendChild(li);
    } else {
      toc.appendChild(li);
    }

    if (level < 6) {
      const sublist = document.createElement('ul');
      sublist.classList.add('sublist');
      li.appendChild(sublist);
      tocLevels.push(sublist);
    }

    tocLink.addEventListener('click', function (event) {
      event.preventDefault();
      const targetElement = document.getElementById(headingId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});