let note = 0
let data: string[] = []

const steps = [     //   - 8 | 4 | 6 | 2 
    { x: 1, y: 2 }, // 0 - * |   |   | * 
    { x: 1, y: 1 }, // 1 - * | * | * |  
    { x: 2, y: 1 }, // 2 - * |   | * |  
    { x: 3, y: 1 }, // 3 - * | * | * |  
    { x: 3, y: 2 }, // 4 - * |   |   | *
    { x: 3, y: 3 }, // 5 - * | * | * |  
    { x: 2, y: 3 }, // 6 - * |   | * |  
    { x: 1, y: 3 }, // 7 - * | * | * |  
];

const sequenceType = [
    [], // 0
    [0], // 1
    [0, 4,], //2
    [2, 5, 7], // 3
    [1, 3, 5, 7], //4
    [0, 1, 3, 4, 6], // 5
    [1, 2, 3, 5, 6, 7], //6
    [0, 1, 2, 3, 4, 5, 7], //7
    [0, 1, 2, 3, 4, 5, 6, 7], //8
]

const noteSequence = [
    { x: 3, y: 4, n: "c" },
    { x: 4, y: 4, n: "d" },
    { x: 4, y: 3, n: "e" },
    { x: 4, y: 2, n: "f" },
    { x: 4, y: 1, n: "g" },
    { x: 4, y: 0, n: "a" },
    { x: 3, y: 0, n: "b" },
]

enum SequencerMode {
    Sequencer = 0,
    Tempo = 1,
    Note = 2,
    Steps = 3
}

function cycle(min: number, max: number, value: number, inc: number): number {
    let next = value + inc;
    if (next > max) {
        next = min;
    } else if (next < min) {
        next = max;
    }

    return Math.clamp(min, max, next);
}

class sequencer {
    static REST = "r";

    model: Array<{
        i: number;
        x: number;
        y: number;
        n: string;
    }>;

    noteNumber: number;
    running: boolean;
    mode: SequencerMode;
    tempo: number;
    currentNote: number;
    sequencerSteps: number;
    sequencerValues: number[];

    constructor(s: number) {
        this.sequencerSteps = s;
        this.sequencerValues = [-1, -1, -1, -1, -1, -1, -1, -1]

        let sequencePosition: number[] = sequenceType[s];
        this.currentNote = 0;
        this.mode = SequencerMode.Sequencer;
        this.tempo = 120;

        music.onEvent(MusicEvent.MelodyEnded, () => {
            this.playMusic();
        });

        music.onEvent(MusicEvent.MelodyNotePlayed, () => {
            if (this.running) {
                this.nextNote();
            }
            //this.displaySequence();
        });
    }

    getMelody() {
        let notes = this.model.map((value: {
            i: number;
            x: number;
            y: number;
            n: string;
        }, index: number) => {
            return value.n + ":1";
        });
        return notes;
    }

    getMelody2() {
        let sequencePosition = sequenceType[this.sequencerSteps];
        let notes = sequencePosition.map((value: number, index: number) => {
            let v = this.sequencerValues[index];
            let n = v >= 0 ? noteSequence[v].n + ":1" : "r:1";
            return n;
        })
        return notes;
    }

    toggleStep() {
        let i = this.noteNumber;
        let v = this.sequencerValues[i];
        this.sequencerValues[i] = v >= 0 ? -1 : this.currentNote;
    }

    nextNote() {
        this.noteNumber = cycle(0, this.sequencerSteps - 1, this.noteNumber, 1);
    }

    displaySequence() {
        let bg = this.mode == SequencerMode.Sequencer || this.mode == SequencerMode.Steps ? 10 : 0;
        let sequencePosition = sequenceType[this.sequencerSteps];
        let i = 0;
        for (let p of sequencePosition) {
            let d = steps[p];
            let v = this.sequencerValues[i];
            let b = this.noteNumber == i ? 255 : v == -1 ? bg : 180;
            led.plotBrightness(d.x, d.y, b);
            i++;
        }

        led.plotBrightness(2, 2, this.mode == SequencerMode.Steps ? 255 : 0)
    }

    displayTempo() {
        let bg = this.mode == SequencerMode.Tempo ? 10 : 0;
        led.plotBrightness(1, 4, bg);
        led.plotBrightness(0, 4, this.tempo >= 60 ? 255 : bg);
        led.plotBrightness(0, 3, this.tempo >= 90 ? 255 : bg);
        led.plotBrightness(0, 2, this.tempo >= 120 ? 255 : bg);
        led.plotBrightness(0, 1, this.tempo >= 150 ? 255 : bg);
        led.plotBrightness(0, 0, this.tempo >= 180 ? 255 : bg);
        led.plotBrightness(1, 0, this.tempo >= 210 ? 255 : bg);
    }

    displayNote() {
        let bg = this.mode == SequencerMode.Note ? 10 : 0;

        for (let i = 0; i < noteSequence.length; i++) {
            let n = noteSequence[i];
            led.plotBrightness(n.x, n.y, this.currentNote == i ? 200 : bg);
        }
    }

    display() {
        this.displaySequence();
        this.displayTempo();
        this.displayNote();
    }

    clearDisplay() {
        for (let s of steps) {
            led.unplot(s.x, s.y);
        }
    }

    playMusic() {
        if (this.running) {
            const melody = this.getMelody2();
            music.setTempo(this.tempo);
            music.startMelody(melody, MelodyOptions.Once);
        }
    }

    start() {
        if (this.running == true) return;
        this.running = true;
        this.noteNumber = 0;
        this.playMusic();
    }

    stop() {
        this.running = false;
    }

    toggleOn() {
        if (this.running) {
            this.stop();
        } else {
            this.start();
        }
    }

    toggleMode() {
        this.mode = cycle(SequencerMode.Sequencer, SequencerMode.Steps, this.mode, 1);
    }

    toggleTempo() {
        this.tempo = cycle(60, 210, this.tempo, 30);
        music.setTempo(this.tempo);
    }

    toggleNote() {
        this.currentNote = cycle(0, noteSequence.length - 1, this.currentNote, +1)
        if (!this.running) {
            let v = noteSequence[this.currentNote];
            music.startMelody([v.n + ":1"], MelodyOptions.Once);
        }
    }

    toggleSeq() {
        this.sequencerSteps = cycle(2, 8, this.sequencerSteps, +1)
        this.clearDisplay();
    }

    toggleAction() {
        switch (this.mode) {
            case SequencerMode.Sequencer:
                this.toggleStep();
                break;
            case SequencerMode.Tempo:
                this.toggleTempo();
                break;
            case SequencerMode.Note:
                this.toggleNote();
                break;
            case SequencerMode.Steps:
                this.toggleSeq();
                break;
        }
    }

}

let seq = new sequencer(8)

control.inBackground(() => {
    while (true) {
        seq.display();
        basic.pause(50);
    }
})




input.onButtonPressed(Button.A, () => {
    seq.toggleAction();
});

input.onButtonPressed(Button.B, () => {

    seq.toggleMode();

})

input.onButtonPressed(Button.AB, () => {
    seq.toggleOn();

})


seq.start();