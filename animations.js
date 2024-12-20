gsap.registerPlugin(ScrollTrigger);

class ParticleSystem {
    constructor() {
        console.log('Initializing particle system');
        this.canvas = document.getElementById('particleCanvas');
        console.log('Canvas element:', this.canvas);
        this.ctx = this.canvas.getContext('2d');
        console.log('Canvas context:', this.ctx);
        this.targetParticleCount = 20;
        this.outerRadius = 400;
        this.particles = [];
        this.discoveryItems = [];
        this.active = false;
        this.particleAssignments = {};
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Store discovery item positions relative to canvas
        this.updateDiscoveryItems();
        window.addEventListener('resize', () => this.updateDiscoveryItems());
        
        // Add fixed positioning to canvas
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none'; // Ensure it doesn't block interactions
    }

    updateDiscoveryItems() {
        this.discoveryItems = [];
        document.querySelectorAll('.discovery-item').forEach(item => {
            const rect = item.getBoundingClientRect();
            
            // Convert viewport coordinates to canvas coordinates
            const x = rect.left + (rect.width / 2);
            const y = rect.top + (rect.height / 2);
            
            this.discoveryItems.push({
                x: x * (this.canvas.width / window.innerWidth),
                y: y * (this.canvas.height / window.innerHeight),
                element: item
            });
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
    }

    createParticle(itemId = null) {
        // Get all ring2 items if no specific item provided
        const ring2Items = Array.from(document.querySelectorAll('.discovery-item.ring2'));
        let targetItem;
        
        if (itemId) {
            targetItem = document.getElementById(itemId);
        } else {
            // Find item with fewest particles
            const counts = {};
            ring2Items.forEach(item => counts[item.id] = 0);
            this.particles.forEach(p => {
                if (p.itemId) counts[p.itemId]++;
            });
            
            targetItem = ring2Items.reduce((a, b) => 
                (counts[a.id] || 0) <= (counts[b.id] || 0) ? a : b
            );
        }

        const rect = targetItem.getBoundingClientRect();
        const itemCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        // Calculate angle from center to item
        const angleToItem = Math.atan2(
            itemCenter.y - this.centerY,
            itemCenter.x - this.centerX
        );

        // Create particle beyond the item in roughly the same direction
        const angleVariation = Math.PI / 6; // 30 degree variation
        const angle = angleToItem + (Math.random() - 0.5) * angleVariation;
        const radius = this.outerRadius + 50 + Math.random() * 50; // 50-100px beyond outer ring
        
        // Calculate base position
        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;
        
        // Add orbital motion
        const orbitSpeed = (Math.random() * 0.2 + 0.1) * (Math.random() < 0.5 ? 1 : -1); // Random speed and direction
        const orbitRadius = 20 + Math.random() * 20; // 20-40px orbit radius
        
        return {
            x,
            y,
            baseX: x,
            baseY: y,
            orbitAngle: Math.random() * Math.PI * 2, // Random starting position in orbit
            orbitSpeed, // Radians per frame
            orbitRadius,
            life: 1,
            duration: 30 + Math.random() * 5,
            age: 0,
            nearestItem: null,
            connectionOpacity: 0,
            itemId: targetItem.id
        };
    }

    update() {
        if (!this.active) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateDiscoveryItems();

        // Count current particles per item
        const particleCounts = {};
        this.particles.forEach(p => {
            if (p.itemId) {
                particleCounts[p.itemId] = (particleCounts[p.itemId] || 0) + 1;
            }
        });

        // Add particles where needed
        document.querySelectorAll('.discovery-item.ring2').forEach(item => {
            const count = particleCounts[item.id] || 0;
            for (let i = count; i < 2; i++) {
                this.particles.push(this.createParticle(item.id));
            }
        });

        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            // Update orbital position
            particle.orbitAngle += particle.orbitSpeed / 60; // Assuming 60fps
            particle.x = particle.baseX + Math.cos(particle.orbitAngle) * particle.orbitRadius;
            particle.y = particle.baseY + Math.sin(particle.orbitAngle) * particle.orbitRadius;
            
            // Update age and life
            particle.age += 1/60;
            
            // Fade in and out
            if (particle.age < 1) { // Longer fade in (1 second)
                particle.life = particle.age;
            } else if (particle.age > particle.duration - 1) { // Longer fade out (1 second)
                particle.life = (particle.duration - particle.age);
            }
            
            // Find nearest discovery item
            let nearestDist = Infinity;
            let nearestItem = null;
            
            this.discoveryItems.forEach(item => {
                const dx = item.x - particle.x;
                const dy = item.y - particle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestItem = item;
                }
            });
            
            particle.nearestItem = nearestItem;
            particle.connectionOpacity = Math.max(0, Math.min(1, (400 - nearestDist) / 400)); // Increased connection range

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.life})`;
            this.ctx.fill();

            // Draw connection line
            if (particle.nearestItem && particle.connectionOpacity > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(particle.nearestItem.x, particle.nearestItem.y);
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${particle.connectionOpacity * 0.3 * particle.life})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            const keepParticle = particle.age < particle.duration;
            
            // If this particle is about to be removed, create a new one for the same item
            if (!keepParticle) {
                this.particles.push(this.createParticle(particle.itemId));
            }

            return keepParticle;
        });

        requestAnimationFrame(() => this.update());
    }

    start() {
        if (this.active) return; // Prevent multiple initializations
        
        this.active = true;
        this.particles = []; // Clear any existing particles
        
        // Initialize with two particles per ring2 item
        document.querySelectorAll('.discovery-item.ring2').forEach(item => {
            for (let i = 0; i < 2; i++) {
                this.particles.push(this.createParticle(item.id));
            }
        });
        gsap.to('.particle-field', { opacity: 1, duration: 0.5 });
        this.update();
    }

    stop() {
        this.active = false;
        this.particles = []; // Clear particles
        gsap.to('.particle-field', { opacity: 0, duration: 0.5 });
    }
}

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
        this.particleSystem = new ParticleSystem();

        // Add touch-specific options to all scene ScrollTriggers
        this.scrollTriggerDefaults = {
            touchScrollAxis: "y",      // Lock to vertical scrolling
            fastScrollEnd: true,       // Better momentum handling
            preventOverlaps: true,     // Prevent multiple triggers firing simultaneously
            snap: {
                snapTo: "labelsDirectional", // Snap to nearest scene
                duration: { min: 0.2, max: 0.5 }, // Faster on mobile
                delay: 0,              // No delay for touch
                ease: "power1.out"     // Smooth easing
            }
        };
    }

    init() {
        // Remove loading class when everything is ready
        document.body.classList.remove('loading');

        // Initial setup
        gsap.set('body', { backgroundColor: '#000000' });
        gsap.set('.protagonist', { 
            opacity: 1,
            scale: 0.166667
        });
        gsap.set('.light-ring', { scale: 0, opacity: 0 });
        gsap.set('.scene-text', { opacity: 0 });
        
        // Set initial state of scroll indicator
        gsap.set('.scroll-indicator', { 
            opacity: 0.7,
            immediateRender: true 
        });
        
        this.initScenes();
    }

    createScrollTrigger(sceneId, callbacks) {
        return {
            trigger: `#${sceneId}`,
            start: "top center",
            end: "bottom center",
            scrub: {
                duration: 0.5,         // Shorter scrub duration for mobile
                smoothing: 0.1         // Less smoothing for more responsive feel
            },
            ...this.scrollTriggerDefaults,
            ...callbacks
        };
    }

    animateText(sceneId, progress) {
        const textId = sceneId.replace('scene', 'text');
        let opacity;
        
        // Special handling for scene4 text
        if (sceneId === 'scene4') {
            opacity = progress * 4; // Just fade in and stay visible
        } else {
            opacity = progress < 0.5 ? progress * 4 : 4 - (progress * 4);
        }
        
        gsap.set(`#${textId}`, { opacity });

        // Handle scroll indicator fade out in scene1
        if (sceneId === 'scene1') {
            gsap.set('.scroll-indicator', { opacity: opacity * 0.7 });
        }
    }

    initScenes() {
        // Add touch event listeners for better scroll control
        let touchStartY = 0;
        let scrolling = false;

        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            scrolling = false;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!scrolling) {
                scrolling = true;
                // Disable any hover effects during scroll
                document.body.classList.add('is-touching');
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            scrolling = false;
            // Re-enable hover effects
            setTimeout(() => {
                document.body.classList.remove('is-touching');
            }, 100);
        });

        // Modify existing scene initialization
        this.scenes.forEach((scene, index) => {
            const timeline = gsap.timeline({
                scrollTrigger: this.createScrollTrigger(scene.id, {
                    onUpdate: (self) => {
                        // Add touch-specific progress handling
                        const progress = self.progress;
                        this.animateText(scene.id, progress);

                        // Smoother transitions for touch devices
                        if (scene.darkOverlay !== null) {
                            const prevOverlay = index > 0 ? this.scenes[index - 1].darkOverlay : 1;
                            const overlayDelta = prevOverlay - scene.darkOverlay;
                            const currentOverlay = gsap.utils.interpolate(
                                prevOverlay, 
                                scene.darkOverlay, 
                                progress
                            );
                            gsap.set(".dark-overlay", { opacity: currentOverlay });
                        }

                        // Particle system handling
                        if (scene.id === 'scene4') {
                            if (progress > 0.3) {
                                this.particleSystem.start();
                            } else {
                                this.particleSystem.stop();
                            }
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
                    
                    // First ring positions (5 items, starting from top)
                    const ring1Positions = Array.from({length: 5}, (_, i) => {
                        const angle = (i * 2 * Math.PI / 5) - Math.PI/2;
                        return {
                            x: innerRadius * Math.cos(angle),
                            y: innerRadius * Math.sin(angle)
                        };
                    });

                    // Second ring positions (10 items)
                    // Add an offset of 1/10th of the circle to align with connections
                    const ring2Positions = Array.from({length: 10}, (_, i) => {
                        const angle = (i * 2 * Math.PI / 10) - Math.PI/2 - (Math.PI / 10);
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

                    // Create and add center-to-ring1 lines
                    const centerLines = ring1Positions.map(pos => {
                        const line = createLine(0, 0, pos.x, pos.y);
                        svg.appendChild(line);
                        return line;
                    });

                    // Create and add ring1-to-ring2 lines
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
                        });
                }

                if (scene.id === 'scene4') {
                    timeline
                        .to('.light-ring.inner', {
                            scale: 6,
                            duration: 1,
                            ease: "power2.out"
                        })
                        .to('.protagonist', {
                            scale: 1,
                            duration: 1,
                            ease: "power2.out"
                        }, "<")
                        .from('.cta-button', {
                            opacity: 0,
                            scale: 0,
                            duration: 1,
                            ease: "power2.out"
                        }, "<")
                        .to('.menu-button', {
                            opacity: 1,
                            duration: 0.5,
                            ease: "power2.out",
                            onComplete: () => document.querySelector('.menu-button').classList.add('active'),
                            onReverseComplete: () => document.querySelector('.menu-button').classList.remove('active')
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

// Combined about section animations
const aboutTimeline = gsap.timeline({
    scrollTrigger: {
        trigger: "#about",
        start: "top 90%",
        end: "top 30%",
        scrub: {
            duration: 0.5,
            smoothing: 0.1
        },
        toggleActions: "play none none reverse",
        touchScrollAxis: "y",
        fastScrollEnd: true,
        preventOverlaps: true
    }
});

aboutTimeline
    .to("body", {
        backgroundColor: "rgb(20, 30, 60)",
        duration: 1
    })
    .to("#about", {
        opacity: 1,
        duration: 0.5
    }, "-=0.5")
    .from(".about-content", {
        y: 100,
        opacity: 0,
        duration: 1
    }, "-=0.3");

// Add menu button animation
gsap.to(".menu-button", {
    scrollTrigger: {
        trigger: "#scene4",
        start: "top center",
        end: "top 20%",
        scrub: true,
        onEnter: () => {
            document.querySelector('.menu-button').classList.add('active');
        },
        onLeaveBack: () => {
            document.querySelector('.menu-button').classList.remove('active');
        }
    }
});