gsap.registerPlugin(ScrollTrigger);

class SceneManager {
    constructor() {
        // Scene configuration
        this.scenes = [
            {
                id: 'scene1',
                darkOverlay: 1,
                lightRing: null,
                isDark: true
            },
            {
                id: 'scene2',
                darkOverlay: 0.7,
                lightRing: 'inner',
                isDark: false,
                hasDiscoveryItems: true
            },
            {
                id: 'scene3',
                darkOverlay: 0.4,
                lightRing: 'outer',
                isDark: false,
                hasConnectionLines: true
            },
            {
                id: 'scene4',
                darkOverlay: 0.2,
                lightRing: 'outer',
                isDark: false
            }
        ];

        this.init();
    }

    init() {
        // Initial setup
        gsap.set('body', { backgroundColor: '#000000' });
        gsap.set('.protagonist', { 
            opacity: 1,
            scale: 0.166667  // 1/6 to match our larger initial size
        });
        gsap.set('.light-ring', { scale: 0, opacity: 0 });
        gsap.set('.scene-text', { opacity: 0 });
        
        this.initScenes();
    }

    createScrollTrigger(sceneId, callbacks) {
        return {
            trigger: `#${sceneId}`,
            start: "top center",
            end: "bottom center",
            scrub: 0.5,
            ...callbacks
        };
    }

    animateText(sceneId, progress) {
        const textId = sceneId.replace('scene', 'text');
        let opacity;
        
        // Special handling for scene4 text
        if (sceneId === 'scene4') {
            opacity = progress * 2; // Just fade in and stay visible
        } else {
            // Original fade in/out behavior for other scenes
            opacity = progress < 0.5 ? progress * 2 : 2 - (progress * 2);
        }
        
        gsap.set(`#${textId}`, { opacity });
    }

    initScenes() {
        this.scenes.forEach((scene, index) => {
            const timeline = gsap.timeline({
                scrollTrigger: this.createScrollTrigger(scene.id, {
                    onUpdate: (self) => {
                        this.animateText(scene.id, self.progress);
                        
                        // Smooth dark overlay transition
                        if (scene.darkOverlay !== null) {
                            const progress = self.progress;
                            const prevOverlay = index > 0 ? this.scenes[index - 1].darkOverlay : 1;
                            const overlayDelta = prevOverlay - scene.darkOverlay;
                            const currentOverlay = prevOverlay - (progress * overlayDelta);
                            gsap.set(".dark-overlay", { opacity: currentOverlay });
                        }
                    }
                })
            });

            if (scene.lightRing) {
                // Animate light ring with larger scales
                timeline.to(`.light-ring.${scene.lightRing}`, {
                    scale: scene.lightRing === 'outer' ? 3 : 1.5,  // Increased scales
                    opacity: 1,
                    duration: 0.5,
                    ease: "power2.out"
                });

                if (scene.hasDiscoveryItems) {
                    // Final positions in pentagon around protagonist
                    const radius = 120;
                    const finalPositions = [
                        { x: 0, y: -radius },     // Top
                        { x: radius * 0.95, y: -radius * 0.31 },  // Top right
                        { x: radius * 0.59, y: radius * 0.81 },   // Bottom right
                        { x: -radius * 0.59, y: radius * 0.81 },  // Bottom left
                        { x: -radius * 0.95, y: -radius * 0.31 }  // Top left
                    ];

                    // Set initial positions
                    finalPositions.forEach((pos, i) => {
                        gsap.set(`#item${i + 1}`, {
                            x: pos.x,
                            y: pos.y,
                            opacity: 0,
                            scale: 0
                        });
                    });

                    // Animate all items simultaneously
                    timeline.to('.discovery-item.ring1', {
                        opacity: 1,
                        scale: 1,
                        duration: 0.5,
                        stagger: 0,
                        ease: "back.out(1.2)"
                    }, "0.2");
                }

                if (scene.hasConnectionLines) {
                    // Calculate positions for both rings
                    const innerRadius = 120;
                    const outerRadius = 240;
                    
                    // First ring positions (5 items)
                    const ring1Positions = Array.from({length: 5}, (_, i) => {
                        const angle = (i * 2 * Math.PI / 5) - Math.PI/2;
                        return {
                            x: innerRadius * Math.cos(angle),
                            y: innerRadius * Math.sin(angle)
                        };
                    });

                    // Second ring positions (10 items)
                    const ring2Positions = Array.from({length: 10}, (_, i) => {
                        const angle = (i * 2 * Math.PI / 10) - Math.PI/2;
                        return {
                            x: outerRadius * Math.cos(angle),
                            y: outerRadius * Math.sin(angle)
                        };
                    });

                    // Set up SVG lines
                    const svg = document.querySelector('.connection-lines');
                    svg.innerHTML = '';
                    svg.setAttribute('width', '600');
                    svg.setAttribute('height', '600');
                    svg.setAttribute('viewBox', '-300 -300 600 600');

                    // Create lines
                    const createLine = (x1, y1, x2, y2) => {
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', x1);
                        line.setAttribute('y1', y1);
                        line.setAttribute('x2', x2);
                        line.setAttribute('y2', y2);
                        line.setAttribute('stroke', 'rgba(255,255,255,0.3)');
                        line.setAttribute('stroke-width', '1');
                        line.setAttribute('opacity', '0');
                        return line;
                    };

                    // Create and add all lines
                    const centerLines = ring1Positions.map(pos => {
                        const line = createLine(0, 0, pos.x, pos.y);
                        svg.appendChild(line);
                        return line;
                    });

                    const ringLines = [];
                    ring1Positions.forEach((pos1, i) => {
                        const startIndex = i * 2;
                        const lines = [
                            createLine(pos1.x, pos1.y, ring2Positions[startIndex].x, ring2Positions[startIndex].y),
                            createLine(pos1.x, pos1.y, ring2Positions[(startIndex + 1) % 10].x, ring2Positions[(startIndex + 1) % 10].y)
                        ];
                        lines.forEach(line => svg.appendChild(line));
                        ringLines.push(...lines);
                    });

                    // Position second ring items
                    ring2Positions.forEach((pos, i) => {
                        gsap.set(`#item${i + 6}`, {
                            x: pos.x,
                            y: pos.y,
                            opacity: 0,
                            scale: 0
                        });
                    });

                    // Add extended lines from outer ring (two per icon)
                    const extendedLines = [];
                    ring2Positions.forEach(pos => {
                        // Calculate base angle from center
                        const baseAngle = Math.atan2(pos.y, pos.x);
                        const spread = Math.PI / 12; // 15 degree spread
                        
                        // Create two lines at slightly different angles
                        [-spread, spread].forEach(angleOffset => {
                            const angle = baseAngle + angleOffset;
                            const extendedRadius = outerRadius * 1.5; // 50% further out
                            const endX = extendedRadius * Math.cos(angle);
                            const endY = extendedRadius * Math.sin(angle);
                            
                            const line = createLine(pos.x, pos.y, endX, endY);
                            svg.appendChild(line);
                            extendedLines.push(line);
                        });
                    });

                    // Animate everything
                    timeline
                        .to(centerLines, {
                            opacity: 1,
                            duration: 0.2,
                            stagger: 0.02
                        })
                        .to(ringLines, {
                            opacity: 1,
                            duration: 0.2,
                            stagger: 0.02
                        }, "+=0.3")
                        .to('.discovery-item.ring2', {
                            opacity: 1,
                            scale: 1,
                            duration: 0.5,
                            stagger: 0.05
                        })
                        .to(extendedLines, {
                            opacity: 0.15,
                            duration: 0.2,
                            stagger: 0.01  // Faster stagger since we have twice as many lines
                        });
                }

                if (scene.id === 'scene4') {
                    timeline
                        .to('.light-ring.inner', {
                            scale: 6,  // Light ring should expand
                            duration: 1,
                            ease: "power2.out"
                        })
                        .to('.protagonist', {
                            scale: 1,  // Protagonist maintains its scale
                            duration: 1,
                            ease: "power2.out"
                        }, "<")  // The "<" makes this animation start at the same time
                        .from('.cta-button', {
                            opacity: 0,
                            scale: 0,
                            duration: 1,
                            ease: "power2.out"
                        }, "<")
                        .to('.menu-button', {
                            opacity: 1,
                            duration: 0.5,
                            ease: "power2.out"
                        }, "-=0.5");
                }
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SceneManager();
    
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