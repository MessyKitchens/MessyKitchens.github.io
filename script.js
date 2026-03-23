// Mobile navigation toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navToggle.classList.toggle('active');
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#' || !href) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      navLinks?.classList.remove('active');
      navToggle?.classList.remove('active');
    }
  });
});

const quickLinkItems = Array.from(document.querySelectorAll('.quick-links a[href^="#"]'));
const quickSections = quickLinkItems
  .map(link => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return null;
    return { link, target };
  })
  .filter(Boolean);

const setActiveQuickLink = sectionId => {
  quickSections.forEach(({ link, target }) => {
    link.classList.toggle('is-active', target.id === sectionId);
  });
};

if (quickSections.length) {
  const updateActiveQuickLink = () => {
    const offset = window.innerHeight * 0.26;
    let activeId = quickSections[0].target.id;

    quickSections.forEach(({ target }) => {
      const top = target.getBoundingClientRect().top;
      if (top <= offset) {
        activeId = target.id;
      }
    });

    setActiveQuickLink(activeId);
  };

  updateActiveQuickLink();
  window.addEventListener('scroll', updateActiveQuickLink, { passive: true });
  window.addEventListener('resize', updateActiveQuickLink);
}

const datasetViewerImage = document.querySelector('#dataset-viewer-image');
const datasetViewerVideo = document.querySelector('#dataset-viewer-video');
const datasetViewerVideoSource = document.querySelector('#dataset-viewer-video-source');
const datasetViewerCaption = document.querySelector('#dataset-viewer-caption');
const datasetViewerVideoCaption = document.querySelector('#dataset-viewer-video-caption');
const datasetThumbs = Array.from(document.querySelectorAll('.dataset-thumb'));

const updateDatasetViewer = trigger => {
  if (!trigger || !datasetViewerImage || !datasetViewerVideo || !datasetViewerVideoSource) {
    return;
  }

  const {
    datasetImage,
    datasetVideo,
    datasetPoster,
    datasetCaption,
    datasetVideoCaption,
  } = trigger.dataset;

  datasetViewerImage.src = datasetImage || '';
  datasetViewerImage.alt = trigger.textContent.trim() || 'MessyKitchens dataset example';
  datasetViewerCaption.textContent = datasetCaption || '';
  datasetViewerVideoCaption.textContent = datasetVideoCaption || '';
  datasetViewerVideo.poster = datasetPoster || datasetImage || '';
  datasetViewerVideoSource.src = datasetVideo || '';
  datasetViewerVideo.load();
  datasetViewerVideo.play().catch(() => {});

  datasetThumbs.forEach(button => {
    button.classList.toggle('is-active', button === trigger);
  });
};

datasetThumbs.forEach(button => {
  button.addEventListener('click', () => updateDatasetViewer(button));
});
