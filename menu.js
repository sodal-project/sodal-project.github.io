
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {

  const menuButton = document.querySelector('.menu-button');
  const menuPanel = document.querySelector('.menu-panel');
  const menuClose = document.querySelector('.menu-close');
  
  if (menuButton && menuPanel && menuClose) {
      menuButton.addEventListener('click', () => {
          menuPanel.classList.toggle('active');
      });
      
      menuClose.addEventListener('click', () => {
          menuPanel.classList.remove('active');
      });
  }
});