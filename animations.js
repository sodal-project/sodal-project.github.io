gsap.registerPlugin(ScrollTrigger);

class SceneManager {
    constructor() {
        // Scene configuration
        this.scenes = [
            {
                id: 'scene1',
                darkOverlay: 1,
                lightRing: null,
                background: '#000000',
                isDark: false
            },
            {
                id: 'scene2',
                darkOverlay: 0.7,
                lightRing: 'inner',
                background: 'var(--gradient-start)',
                isDark: false,
                hasDiscoveryItems: true
            },
            {
                id: 'scene3',
                darkOverlay: 0.4,
                lightRing: 'outer',
                background: 'var(--gradient-mid)',
                isDark: false,
                hasConnectionLines: true
            },
            {
                id: 'scene4',
                darkOverlay: 0.2,
                lightRing: 'outer',
                background: 'var(--gradient-end)',
                isDark: false
            }
        ];

        this.init();
    }

    init() {
        // Initial setup
        gsap.set('body', { backgroundColor: '#000000' });
        gsap.set('.protagonist', { opacity: 1 });
        gsap.set('.light-ring', { scale: 0, opacity: 0 });
        gsap.set('.scene-text', { opacity: 0 });
        
        // Remove initial protagonist animation since it starts visible
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
        const opacity = progress < 0.5 ? progress * 2 : 2 - (progress * 2);
        gsap.set(`#${textId}`, { opacity });
    }

    initScenes() {
        this.scenes.forEach((scene, index) => {
            const timeline = gsap.timeline({
                scrollTrigger: this.createScrollTrigger(scene.id, {
                    onUpdate: (self) => {
                        this.animateText(scene.id, self.progress);
                        
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

            // Add scene-specific animations
            if (scene.lightRing) {
                timeline.to(`.light-ring.${scene.lightRing}`, {
                    scale: scene.lightRing === 'outer' ? 2.5 : 1,
                    opacity: scene.lightRing === 'outer' ? 0.6 : 0.4,
                    duration: 1,
                    ease: "power2.inOut"
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

                    // Set initial positions (same as final, but with opacity 0 and scale 0)
                    finalPositions.forEach((pos, i) => {
                        gsap.set(`#item${i + 1}`, {
                            x: pos.x,
                            y: pos.y,
                            opacity: 0,
                            scale: 0
                        });
                    });

                    // Fade in and scale up in position
                    finalPositions.forEach((pos, i) => {
                        timeline.to(`#item${i + 1}`, {
                            opacity: 1,
                            scale: 1,
                            duration: 1,
                            ease: "power2.out"
                        }, "<+=0.2"); // Stagger the animations
                    });
                }
            }

            if (scene.background) {
                timeline.to('body', {
                    background: scene.background,
                    duration: 1,
                    ease: "power2.inOut"
                }, "<");
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

                // Create SVG lines
                const svg = document.querySelector('.connection-lines');
                svg.innerHTML = ''; // Clear existing lines

                // Create and position lines
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

                // Add lines from protagonist to first ring
                const centerLines = ring1Positions.map(pos => {
                    const line = createLine(0, 0, pos.x, pos.y);
                    svg.appendChild(line);
                    return line;
                });

                // Add lines from first ring to second ring
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

                // Animate second ring of items
                ring2Positions.forEach((pos, i) => {
                    gsap.set(`#item${i + 6}`, {
                        x: pos.x,
                        y: pos.y,
                        opacity: 0,
                        scale: 0
                    });
                });

                // Animation sequence
                timeline
                    // First animate center lines
                    .to(centerLines, {
                        opacity: 1,
                        duration: 0.5,
                        stagger: 0.1
                    })
                    // Then animate ring lines
                    .to(ringLines, {
                        opacity: 1,
                        duration: 0.5,
                        stagger: 0.05
                    })
                    // Finally animate second ring items
                    .to('.ring2', {
                        opacity: 1,
                        scale: 1,
                        duration: 0.5,
                        stagger: 0.05
                    });
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SceneManager();
});