import 'phaser';

export class FarmScene extends Phaser.Scene {
    private plots: Phaser.GameObjects.Sprite[] = [];
    private barn!: Phaser.GameObjects.Sprite;
    private animals: Phaser.GameObjects.Sprite[] = [];
    private cows: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
    private bull!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private worldWidth: number = 2400;  // 3x default width
    private worldHeight: number = 1800; // 3x default height

    constructor() {
        super({ key: 'FarmScene' });
    }

    preload() {
        // Load all sprite assets
        this.load.image('grass', 'assets/grass.png');
        this.load.image('plot', 'assets/plot.png');
        this.load.image('barn', 'assets/barn.png');
        this.load.image('player', 'assets/player.png');
        this.load.image('chicken', 'assets/chicken.png');
        this.load.image('cow', 'assets/cow.png');
        this.load.image('bull', 'assets/bull.png');
    }

    create() {
        // Set world bounds
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Create grass background (tiled)
        for (let y = 0; y < this.worldHeight; y += 32) {
            for (let x = 0; x < this.worldWidth; x += 32) {
                this.add.sprite(x + 16, y + 16, 'grass');
            }
        }

        // Create farm plots in the center area
        const plotSpacing = 80;
        const startX = this.worldWidth / 2 - (plotSpacing * 2);
        const startY = this.worldHeight / 2 - (plotSpacing * 1.5);

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                const plot = this.add.sprite(
                    startX + col * plotSpacing,
                    startY + row * plotSpacing,
                    'plot'
                );
                this.plots.push(plot);
            }
        }

        // Create barn near the plots
        this.barn = this.add.sprite(startX + plotSpacing * 5, startY - 32, 'barn');
        this.physics.add.existing(this.barn, true);
        const barnBody = this.barn.body as Phaser.Physics.Arcade.Body;
        barnBody.setSize(72, 60);
        barnBody.setOffset(12, 36);

        // Create cows in a grazing area
        const cowPositions = [
            { x: startX + plotSpacing * 4, y: startY + plotSpacing * 4 },
            { x: startX + plotSpacing * 5, y: startY + plotSpacing * 4.5 },
            { x: startX + plotSpacing * 6, y: startY + plotSpacing * 4 }
        ];

        cowPositions.forEach(pos => {
            const cow = this.physics.add.sprite(pos.x, pos.y, 'cow');
            cow.setCollideWorldBounds(true);
            this.physics.add.collider(cow, this.barn);
            this.cows.push(cow);

            // Add movement properties to the cow
            (cow as any).moveTimer = 0;
            (cow as any).moveDirection = new Phaser.Math.Vector2(0, 0);
        });

        // Add colliders between cows
        this.physics.add.collider(this.cows, this.cows);

        // Create animals (chickens)
        const animalPositions = [
            { x: startX + plotSpacing * 5.5, y: startY + plotSpacing * 2 },
            { x: startX + plotSpacing * 6, y: startY + plotSpacing * 2.5 },
            { x: startX + plotSpacing * 5.5, y: startY + plotSpacing * 3 }
        ];

        animalPositions.forEach(pos => {
            const animal = this.add.sprite(pos.x, pos.y, 'chicken');
            this.animals.push(animal);
        });

        // Create player in the center
        this.player = this.add.sprite(this.worldWidth / 2, this.worldHeight / 2, 'player');
        this.physics.add.existing(this.player);
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);

        // Add collision between player and barn
        this.physics.add.collider(this.player, this.barn);
        // Add collision between player and cows
        this.physics.add.collider(this.player, this.cows);

        // Setup camera to follow player
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(1);

        // Add some basic text that stays fixed on screen
        this.add.text(16, 16, 'Farm View', {
            fontSize: '24px',
            color: '#000'
        })
        .setScrollFactor(0);

        // Setup keyboard controls
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Add resize handler
        this.scale.on('resize', this.handleResize, this);

        // Create bull in a separate area
        const bullX = startX + plotSpacing * 7;
        const bullY = startY + plotSpacing * 5;
        this.bull = this.physics.add.sprite(bullX, bullY, 'bull');
        this.bull.setCollideWorldBounds(true);
        this.physics.add.collider(this.bull, this.barn);
        
        // Add bull properties for peaceful wandering
        (this.bull as any).moveTimer = 0;
        (this.bull as any).moveDirection = new Phaser.Math.Vector2(0, 0);
        
        // Add colliders for bull
        this.physics.add.collider(this.bull, this.cows);
        this.physics.add.collider(this.player, this.bull);  // Simple collision without special handling
    }

    handleResize(gameSize: Phaser.Structs.Size) {
        const zoom = Math.min(gameSize.width / 800, gameSize.height / 600);
        this.cameras.main.setZoom(Math.min(1, zoom));
    }

    update() {
        // Handle player movement
        const speed = 3;
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setVelocity(0);

        if (this.cursors.up.isDown) {
            playerBody.setVelocityY(-speed * 60);
        }
        else if (this.cursors.down.isDown) {
            playerBody.setVelocityY(speed * 60);
        }
        
        if (this.cursors.left.isDown) {
            playerBody.setVelocityX(-speed * 60);
            this.player.setFlipX(true);
        }
        else if (this.cursors.right.isDown) {
            playerBody.setVelocityX(speed * 60);
            this.player.setFlipX(false);
        }

        // Make animals wander randomly with smooth movement
        this.animals.forEach(animal => {
            if (Math.random() < 0.02) {
                const direction = Math.random() * Math.PI * 2;
                animal.x += Math.cos(direction) * 2;
                animal.y += Math.sin(direction) * 2;
                animal.setFlipX(Math.cos(direction) < 0);
            }
        });

        // Update cow movement
        this.cows.forEach(cow => {
            (cow as any).moveTimer--;
            
            if ((cow as any).moveTimer <= 0) {
                // Choose new direction and duration
                const angle = Math.random() * Math.PI * 2;
                (cow as any).moveDirection.x = Math.cos(angle);
                (cow as any).moveDirection.y = Math.sin(angle);
                (cow as any).moveTimer = Math.random() * 120 + 60; // Move for 1-3 seconds
                
                // Flip the cow sprite based on movement direction
                cow.setFlipX((cow as any).moveDirection.x < 0);
            }
            
            // Apply movement
            if ((cow as any).moveTimer > 0) {
                cow.setVelocity(
                    (cow as any).moveDirection.x * 40,
                    (cow as any).moveDirection.y * 40
                );
            } else {
                cow.setVelocity(0, 0);
            }
        });

        // Update bull movement (peaceful wandering like cows)
        if (this.bull) {
            (this.bull as any).moveTimer--;
            
            if ((this.bull as any).moveTimer <= 0) {
                // Choose new direction and duration for normal movement
                const angle = Math.random() * Math.PI * 2;
                (this.bull as any).moveDirection.x = Math.cos(angle);
                (this.bull as any).moveDirection.y = Math.sin(angle);
                (this.bull as any).moveTimer = Math.random() * 180 + 60;  // Wander for 1-4 seconds
                this.bull.setFlipX((this.bull as any).moveDirection.x < 0);
            }
            
            // Normal peaceful movement
            if ((this.bull as any).moveTimer > 0) {
                this.bull.setVelocity(
                    (this.bull as any).moveDirection.x * 40,  // Same speed as cows
                    (this.bull as any).moveDirection.y * 40
                );
            } else {
                this.bull.setVelocity(0, 0);
            }
        }
    }
} 