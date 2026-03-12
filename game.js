const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
let score = 0;
let health = 100;
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let keys = {};

// Cooldown system
const cooldowns = {
    kick: 0,
    snare: 0,
    tom1: 0,
    tom2: 0,
    hihat: 0
};

const cooldownDuration = {
    kick: 1000,   // 1 second
    snare: 200,   // 0.2 seconds
    tom1: 300,    // 0.3 seconds
    tom2: 300,    // 0.3 seconds
    hihat: 150    // 0.15 seconds
};

// Player object
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 50,
    image: null,
    angle: 0
};

// Arrays for game objects
let enemies = [];
let projectiles = [];
let shockwaves = [];
let particles = [];

// Load player image
const philImage = new Image();
philImage.src = 'Art/PhilDrums.png';
philImage.onload = () => {
    player.image = philImage;
};

// Load enemy images
const jingbahImage = new Image();
jingbahImage.src = 'Art/Jingbah_fly.png';

const jumbahImage = new Image();
jumbahImage.src = 'Art/Jumbah_fly.png';

const zingbahImage = new Image();
zingbahImage.src = 'Art/Zingbah_fly.png';

const zumbahImage = new Image();
zumbahImage.src = 'Art/Zumbah_fly.png';

const enemyImages = [jingbahImage, jumbahImage, zingbahImage, zumbahImage];
const blueNoteImage = new Image();
blueNoteImage.src = 'Art/blueNote.png';

const crashNoteImage = new Image();
crashNoteImage.src = 'Art/crashNote.png';

const redNoteImage = new Image();
redNoteImage.src = 'Art/redNote.png';

const aquarianKickImage = new Image();
aquarianKickImage.src = 'Art/aquariankick.png';

// Drum types
const DRUMS = {
    KICK: { key: ' ', color: '#ff6b6b', size: 20, damage: 30, speed: 6, type: 'projectile', image: blueNoteImage },
    SNARE: { key: 'w', color: '#4ecdc4', size: 15, damage: 15, speed: 8, type: 'projectile', image: redNoteImage },
    TOM1: { key: 'a', color: '#45b7d1', size: 12, damage: 10, speed: 7, type: 'projectile', image: redNoteImage },
    TOM2: { key: 's', color: '#96ceb4', size: 12, damage: 10, speed: 7, type: 'projectile', image: redNoteImage },
    HIHAT: { key: 'd', color: '#ffeaa7', size: 10, damage: 5, speed: 10, type: 'projectile', image: crashNoteImage }
};

// Enemy class
class Enemy {
    constructor() {
        this.id = Math.random().toString(36).substr(2, 9); // Unique ID
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // top
                this.x = Math.random() * canvas.width;
                this.y = -50;
                break;
            case 1: // right
                this.x = canvas.width + 50;
                this.y = Math.random() * canvas.height;
                break;
            case 2: // bottom
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + 50;
                break;
            case 3: // left
                this.x = -50;
                this.y = Math.random() * canvas.height;
                break;
        }
        
        this.radius = 40;
        this.speed = 1 + Math.random();
        this.health = 30 + Math.random() * 20;
        this.maxHealth = this.health;
        this.image = enemyImages[Math.floor(Math.random() * enemyImages.length)];
        this.angle = 0;
    }
    
    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
        
        // Rotate enemy to face player
        this.angle = Math.atan2(dy, dx) + Math.PI / 2;
    }
    
    draw() {
        // Draw enemy image
        if (this.image && this.image.complete) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.restore();
        } else {
            // Fallback to colored circle if image not loaded
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Health bar
        const barWidth = this.radius * 2;
        const barHeight = 4;
        const barY = this.y - this.radius - 15;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(this.x - barWidth/2, barY, barWidth * (this.health / this.maxHealth), barHeight);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barWidth/2, barY, barWidth, barHeight);
    }
    
    takeDamage(damage) {
        this.health -= damage;
        createParticles(this.x, this.y, '#ff6b6b');
        return this.health <= 0;
    }
}

// Projectile class
class Projectile {
    constructor(x, y, targetX, targetY, drum) {
        this.x = x;
        this.y = y;
        this.drum = drum;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.vx = (dx / distance) * drum.speed;
        this.vy = (dy / distance) * drum.speed;
        this.radius = drum.size;
        this.damage = drum.damage;
        this.color = drum.color;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    
    draw() {
        if (this.drum.image && this.drum.image.complete) {
            ctx.drawImage(this.drum.image, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    isOffScreen() {
        return this.x < -50 || this.x > canvas.width + 50 || 
               this.y < -50 || this.y > canvas.height + 50;
    }
}

// Shockwave class
class Shockwave {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0   ;
        this.maxRadius = Math.max(canvas.width, canvas.height);
        this.damage = 30;
        this.expandSpeed = 8;
        this.opacity = 1;
        this.hasHit = new Set(); // Track enemies already hit by this shockwave
    }
    
    update() {
        this.radius += this.expandSpeed;
        this.opacity = Math.max(0, 1 - (this.radius / this.maxRadius));
    }
    
    draw() {
        if (aquarianKickImage.complete) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(
                aquarianKickImage, 
                this.x - this.radius, 
                this.y - this.radius, 
                this.radius * 2, 
                this.radius * 2
            );
            ctx.restore();
        } else {
            // Fallback to circle if image not loaded
            ctx.strokeStyle = `rgba(255, 107, 107, ${this.opacity})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    isDone() {
        return this.radius >= this.maxRadius;
    }
    
    hitsEnemy(enemy) {
        // Check if enemy is within shockwave radius and hasn't been hit yet
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.radius && !this.hasHit.has(enemy.id)) {
            this.hasHit.add(enemy.id);
            return true;
        }
        return false;
    }
}

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 3 + 1;
        this.color = color;
        this.life = 1;
        this.decay = 0.02;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
    }
    
    draw() {
        ctx.fillStyle = this.color.replace(')', `, ${this.life})`).replace('hsl', 'hsla');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.life, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function playDrum(drumKey) {
    const drum = Object.values(DRUMS).find(d => d.key === drumKey);
    if (!drum) return;
    
    // Check cooldowns
    let cooldownKey;
    switch(drumKey) {
        case ' ': cooldownKey = 'kick'; break;
        case 'w': cooldownKey = 'snare'; break;
        case 'a': cooldownKey = 'tom1'; break;
        case 's': cooldownKey = 'tom2'; break;
        case 'd': cooldownKey = 'hihat'; break;
    }
    
    if (cooldowns[cooldownKey] > 0) return; // Still on cooldown
    
    // Set cooldown
    cooldowns[cooldownKey] = cooldownDuration[cooldownKey];
    
    projectiles.push(new Projectile(player.x, player.y, mouseX, mouseY, drum));
}

function spawnEnemy() {
    if (Math.random() < 0.005 + (score / 50000)) {
        enemies.push(new Enemy());
    }
}

function checkCollisions() {
    // Projectiles vs Enemies
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = projectile.x - enemy.x;
            const dy = projectile.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < projectile.radius + enemy.radius) {
                if (enemy.takeDamage(projectile.damage)) {
                    enemies.splice(j, 1);
                    score += 10;
                    updateUI();
                }
                projectiles.splice(i, 1);
                break;
            }
        }
    }
    
    // Enemies vs Player
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < enemy.radius + player.radius) {
            health -= 10;
            enemies.splice(i, 1);
            createParticles(player.x, player.y, '#ff0000');
            updateUI();
            
            if (health <= 0) {
                gameOver();
            }
        }
    }
}

function updateUI() {
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('healthValue').textContent = Math.max(0, health);
}

function gameOver() {
    alert(`I DON'T CARE ANYMORE: ${score}`);
    score = 0;
    health = 100;
    enemies = [];
    projectiles = [];
    particles = [];
    
    // Reset cooldowns
    Object.keys(cooldowns).forEach(key => {
        cooldowns[key] = 0;
    });
    
    updateUI();
}

function update() {
    // Update enemies
    enemies.forEach(enemy => enemy.update());
    
    // Update projectiles
    projectiles = projectiles.filter(projectile => {
        projectile.update();
        return !projectile.isOffScreen();
    });
    
    // Update particles
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
    
    // Update cooldowns
    Object.keys(cooldowns).forEach(key => {
        if (cooldowns[key] > 0) {
            cooldowns[key] -= 16; // Assuming 60 FPS, ~16ms per frame
        }
    });
    
    // Spawn enemies
    spawnEnemy();
    
    // Check collisions
    checkCollisions();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw particles
    particles.forEach(particle => particle.draw());
    
    // Draw projectiles
    projectiles.forEach(projectile => projectile.draw());
    
    // Draw enemies
    enemies.forEach(enemy => enemy.draw());
    
    // Draw player
    if (player.image && player.image.complete) {
        ctx.save();
        ctx.translate(player.x, player.y);
        // Keep Phil facing forward (no rotation)
        ctx.drawImage(player.image, -player.radius, -player.radius, player.radius * 2, player.radius * 2);
        ctx.restore();
    } else {
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw aim line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw cooldown indicators
    drawCooldownIndicators();
}

function drawCooldownIndicators() {
    const indicatorY = canvas.height - 30;
    const startX = 50;
    const spacing = 120;
    
    // Kick drum
    drawCooldownIndicator(startX, indicatorY, 'Space', cooldowns.kick, cooldownDuration.kick, '#ff6b6b');
    
    // Snare
    drawCooldownIndicator(startX + spacing, indicatorY, 'W', cooldowns.snare, cooldownDuration.snare, '#4ecdc4');
    
    // Tom1
    drawCooldownIndicator(startX + spacing * 2, indicatorY, 'A', cooldowns.tom1, cooldownDuration.tom1, '#45b7d1');
    
    // Tom2
    drawCooldownIndicator(startX + spacing * 3, indicatorY, 'S', cooldowns.tom2, cooldownDuration.tom2, '#96ceb4');
    
    // Hi-hat
    drawCooldownIndicator(startX + spacing * 4, indicatorY, 'D', cooldowns.hihat, cooldownDuration.hihat, '#ffeaa7');
}

function drawCooldownIndicator(x, y, label, current, max, color) {
    const width = 80;
    const height = 8;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - width/2, y - height/2, width, height);
    
    // Cooldown bar
    if (current > 0) {
        ctx.fillStyle = color;
        ctx.fillRect(x - width/2, y - height/2, width * (current / max), height);
    }
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - width/2, y - height/2, width, height);
    
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 12);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    const drumKey = e.key.toLowerCase();
    if (Object.values(DRUMS).some(drum => drum.key === drumKey)) {
        playDrum(drumKey);
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Update player angle to face mouse
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    player.angle = Math.atan2(dy, dx) + Math.PI / 2;
});

// Start game
updateUI();
gameLoop();
