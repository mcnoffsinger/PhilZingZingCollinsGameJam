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

// Player object
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 30,
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

// Drum types
const DRUMS = {
    KICK: { key: ' ', color: '#ff6b6b', size: 40, damage: 30, speed: 1, type: 'shockwave' },
    SNARE: { key: 'w', color: '#4ecdc4', size: 8, damage: 15, speed: 8, type: 'projectile' },
    TOM1: { key: 'a', color: '#45b7d1', size: 6, damage: 10, speed: 7, type: 'projectile' },
    TOM2: { key: 's', color: '#96ceb4', size: 6, damage: 10, speed: 7, type: 'projectile' },
    HIHAT: { key: 'd', color: '#ffeaa7', size: 4, damage: 5, speed: 10, type: 'projectile' }
};

// Enemy class
class Enemy {
    constructor() {
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // top
                this.x = Math.random() * canvas.width;
                this.y = -20;
                break;
            case 1: // right
                this.x = canvas.width + 20;
                this.y = Math.random() * canvas.height;
                break;
            case 2: // bottom
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + 20;
                break;
            case 3: // left
                this.x = -20;
                this.y = Math.random() * canvas.height;
                break;
        }
        
        this.radius = 15 + Math.random() * 10;
        this.speed = 1 + Math.random();// got rid of * 2 to make enemies slower
        this.health = 30 + Math.random() * 20;
        this.maxHealth = this.health;
        this.color = `hsl(${Math.random() * 60}, 70%, 50%)`;
    }
    
    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
    }
    
    draw() {
        // Enemy body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        const barWidth = this.radius * 2;
        const barHeight = 4;
        const barY = this.y - this.radius - 10;
        
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
        createParticles(this.x, this.y, this.color);
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
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
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
        this.radius = 10;
        this.maxRadius = 150;
        this.damage = 30;
        this.expandSpeed = 5;
        this.opacity = 1;
    }
    
    update() {
        this.radius += this.expandSpeed;
        this.opacity = 1 - (this.radius / this.maxRadius);
    }
    
    draw() {
        ctx.strokeStyle = `rgba(255, 107, 107, ${this.opacity})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    isDone() {
        return this.radius >= this.maxRadius;
    }
    
    hitsEnemy(enemy) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return Math.abs(distance - this.radius) < enemy.radius + 10;
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
    
    if (drum.type === 'shockwave') {
        shockwaves.push(new Shockwave(player.x, player.y));
    } else {
        projectiles.push(new Projectile(player.x, player.y, mouseX, mouseY, drum));
    }
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
    
    // Shockwaves vs Enemies
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const shockwave = shockwaves[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (shockwave.hitsEnemy(enemy)) {
                if (enemy.takeDamage(shockwave.damage)) {
                    enemies.splice(j, 1);
                    score += 10;
                    updateUI();
                }
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
    shockwaves = [];
    particles = [];
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
    
    // Update shockwaves
    shockwaves = shockwaves.filter(shockwave => !shockwave.isDone());
    
    // Update particles
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
    
    // Spawn enemies
    spawnEnemy();
    
    // Check collisions
    checkCollisions();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';//I fucked this on purpose
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw particles
    particles.forEach(particle => particle.draw());
    
    // Draw shockwaves
    shockwaves.forEach(shockwave => shockwave.draw());
    
    // Draw projectiles
    projectiles.forEach(projectile => projectile.draw());
    
    // Draw enemies
    enemies.forEach(enemy => enemy.draw());
    
    // Draw player
    if (player.image) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle + 3.141529);
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
