const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Vector = Matter.Vector;
const Events = Matter.Events;

let engine;
let circles = [];
let ground, wallLeft, wallRight;
let movingBar;
let barActive = false;
let barDirection = 1;
let pumpCounter = 0;

let windShieldImage;
let alexImage;
let explosiveAlexImage;

let alexCreationCounter = 0;

let wiperSound;
let popSound;
let explosionSound;
let dribbleSound;
let backgroundMusic;
let musicStarted = false;

function preload() {
    windShieldImage = loadImage('assets/images/image.png');
    alexImage = loadImage('assets/images/alex.png');
    explosiveAlexImage = loadImage('assets/images/explode.png');

    soundFormats('wav', 'mp3');
    wiperSound = loadSound('assets/sounds/wiper.wav');
    popSound = loadSound('assets/sounds/pop.wav');
    explosionSound = loadSound('assets/sounds/explosion.mp3');
    dribbleSound = loadSound('assets/sounds/dribble.wav');
    backgroundMusic = loadSound('assets/sounds/back.mp3');
}

function setup() {
    createCanvas(500, 700);
    engine = Engine.create();

    ground = Bodies.rectangle(width / 2, height - 20, width, 10, { isStatic: true, label: 'ground' });
    wallLeft = Bodies.rectangle(0, height / 2, 10, height, { isStatic: true, label: 'wallLeft' });
    wallRight = Bodies.rectangle(width, height / 2, 10, height, { isStatic: true, label: 'wallRight' });

    movingBar = Bodies.rectangle(0, height / 2, 20, height, {
        isStatic: true,
        label: 'movingBar'
    });

    World.add(engine.world, [ground, wallLeft, wallRight, movingBar]);

    Events.on(engine, 'collisionStart', handleCollisions);
}

function draw() {
    background(255);
    Engine.update(engine);

    for (let circle of circles) {
        circle.show();
    }

    fill(0);
    textSize(16);
    textAlign(LEFT);
    text("Click to create an Alex.", 20, 30);


    if (circles.length >= 70 && !barActive) {
        barActive = true;
        Body.setPosition(movingBar, { x: 0, y: height / 2 });
        if (wiperSound && !wiperSound.isPlaying() && wiperSound.isLoaded()) {
            wiperSound.loop();
        }
    }

    if (circles.length >= 70 || barActive) {
        push();
        let pos = movingBar.position;
        imageMode(CENTER);
        let imgWidth = 60;
        let imgHeight = height;
        image(windShieldImage, pos.x, pos.y, imgWidth, imgHeight);
        pop();
    }

    if (barActive) {
        if (barDirection === 1) {
            Body.setPosition(movingBar, { x: movingBar.position.x + 3, y: movingBar.position.y });
            pumpCounter++;
            if (pumpCounter >= 15) {
                barDirection = -1;
                pumpCounter = 0;
            }
        } else {
            Body.setPosition(movingBar, { x: movingBar.position.x - 1, y: movingBar.position.y });
            pumpCounter++;
            if (pumpCounter >= 5) {
                barDirection = 1;
                pumpCounter = 0;
            }
        }

        for (let i = circles.length - 1; i >= 0; i--) {
            let circleRightEdge = circles[i].body.position.x + circles[i].radius;
            if (circleRightEdge >= width) {
                World.remove(engine.world, circles[i].body);
                circles.splice(i, 1);
            }
        }

        if (movingBar.position.x > width + 100) {
            barActive = false;
            barDirection = 1;
            pumpCounter = 0;
            Body.setPosition(movingBar, { x: 0, y: height / 2 });
            if (wiperSound && wiperSound.isPlaying()) {
                wiperSound.stop();
            }
        }
    }

    noFill();
    stroke(0);
    strokeWeight(4);
    rect(0, 0, width, height);
    strokeWeight(1);
}

function mousePressed() {
    if (popSound && popSound.isLoaded()) {
        popSound.play();
    }

    if (!musicStarted && backgroundMusic && backgroundMusic.isLoaded()) {
        backgroundMusic.loop();
        backgroundMusic.setVolume(0.3);
        musicStarted = true;
    }

    for (let i = circles.length - 1; i >= 0; i--) {
        let circle = circles[i];
        if (circle.isExplosive) {
            let d = dist(mouseX, mouseY, circle.body.position.x, circle.body.position.y);
            if (d < circle.radius) {
                triggerExplosion(circle);
                return;
            }
        }
    }

    alexCreationCounter++;
    const isNowExplosive = (alexCreationCounter > 0 && alexCreationCounter % 90 === 0);
    const radius = random(20, 50);
    circles.push(new Circle(mouseX, mouseY, radius, isNowExplosive, { label: 'alex' }));
}

function triggerExplosion(explodingCircle) {
    if (explosionSound && explosionSound.isLoaded()) {
        explosionSound.setVolume(0.4);
        explosionSound.play();
    }

    const explosionCenter = explodingCircle.body.position;
    const minForceFactor = 0.2;
    const maxForceFactor = 0.5;

    for (let i = circles.length - 1; i >= 0; i--) {
        let otherCircle = circles[i];
        if (otherCircle === explodingCircle) continue;

        let vectorToCircle = Vector.sub(otherCircle.body.position, explosionCenter);

        if (Vector.magnitudeSquared(vectorToCircle) < 1e-4) {
            vectorToCircle = { x: random(-1, 1), y: random(-1.5, -0.5) };
            if (Vector.magnitudeSquared(vectorToCircle) < 1e-4) {
                vectorToCircle = { x: 0, y: -1 };
            }
        }

        let direction = Vector.normalise(vectorToCircle);
        let strengthFactor = random(minForceFactor, maxForceFactor);
        let forceMagnitude = strengthFactor * otherCircle.body.mass;
        let force = Vector.mult(direction, forceMagnitude);
        force.y -= 0.15 * otherCircle.body.mass;
        Body.applyForce(otherCircle.body, otherCircle.body.position, force);
    }

    World.remove(engine.world, explodingCircle.body);
    let index = circles.indexOf(explodingCircle);
    if (index > -1) {
        circles.splice(index, 1);
    }
}

function handleCollisions(event) {
    const pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if ((bodyA.label === 'alex' && bodyB.label === 'ground') ||
            (bodyB.label === 'alex' && bodyA.label === 'ground')) {
            const alexBody = (bodyA.label === 'alex') ? bodyA : bodyB;
            let alexExists = false;
            for (let circle of circles) {
                if (circle.body === alexBody) {
                    alexExists = true;
                    break;
                }
            }

            if (alexExists && dribbleSound && dribbleSound.isLoaded()) {
                dribbleSound.play();
            }
        }
    }
}

class Circle {
    constructor(x, y, radius, isExplosive = false, customOptions = {}) {
        let options = {
            friction: 0.3,
            restitution: 0.6,
            ...customOptions
        };
        this.body = Bodies.circle(x, y, radius, options);
        if (!this.body.label || this.body.label === 'Circle Body') {
            Body.set(this.body, "label", "alex");
        }

        this.radius = radius;
        this.isExplosive = isExplosive;
        World.add(engine.world, this.body);
    }

    show() {
        let pos = this.body.position;
        let angle = this.body.angle;

        push();
        translate(pos.x, pos.y);
        rotate(angle);
        imageMode(CENTER);
        if (this.isExplosive) {
            image(explosiveAlexImage, 0, 0, this.radius * 2, this.radius * 2);
        } else {
            image(alexImage, 0, 0, this.radius * 2, this.radius * 2);
        }
        pop();
    }
}