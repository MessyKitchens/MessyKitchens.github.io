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

const demoModal = document.querySelector('.demo-modal');
const demoModalVideo = document.querySelector('#demo-modal-video');
const demoModalLink = document.querySelector('#demo-modal-link');
const demoModalTitle = document.querySelector('#demo-modal-title');
const demoModalNote = document.querySelector('#demo-modal-note');
const demoModalInput = document.querySelector('#demo-modal-input');
const demoModalSam3d = document.querySelector('#demo-modal-sam3d');
const demoModalMod = document.querySelector('#demo-modal-mod');
const demoModalGt = document.querySelector('#demo-modal-gt');

const setImageSource = (element, src) => {
  if (!element) return;
  element.src = src || '';
};

const closeDemoModal = () => {
  if (!demoModal) return;
  demoModal.hidden = true;
  document.body.style.overflow = '';
  if (demoModalVideo) {
    demoModalVideo.pause();
    demoModalVideo.removeAttribute('src');
    demoModalVideo.removeAttribute('poster');
    demoModalVideo.load();
  }
};

const openDemoModal = trigger => {
  if (!demoModal || !trigger || !demoModalVideo) return;

  const {
    demoTitle,
    demoNote,
    demoVideo,
    demoPoster,
    demoInput,
    demoSam3d,
    demoMod,
    demoGt,
  } = trigger.dataset;

  demoModalTitle.textContent = demoTitle || 'Iterative Demo';
  demoModalNote.textContent = demoNote || '';
  demoModalVideo.src = demoVideo || '';
  demoModalVideo.poster = demoPoster || '';
  demoModalLink.href = demoVideo || '#';

  setImageSource(demoModalInput, demoInput);
  setImageSource(demoModalSam3d, demoSam3d);
  setImageSource(demoModalMod, demoMod);
  setImageSource(demoModalGt, demoGt);

  demoModal.hidden = false;
  document.body.style.overflow = 'hidden';
  demoModalVideo.load();
  demoModalVideo.play().catch(() => {});
};

document.querySelectorAll('.iterative-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => openDemoModal(trigger));
});

document.querySelectorAll('[data-demo-close]').forEach(closeButton => {
  closeButton.addEventListener('click', closeDemoModal);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && demoModal && !demoModal.hidden) {
    closeDemoModal();
  }
});
