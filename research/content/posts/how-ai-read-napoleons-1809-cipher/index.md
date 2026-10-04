---
title: "How AI read Napoleon's 1809 cipher letter — and how we checked it"
date: 2026-10-04
draft: false
image: cover.jpg
description: "An independent offline check of Carter Church's GPT-6 Astra decipherment of the 1809 Marmont letter: what the cipher is, how the pipeline worked, and what the published package actually proves."
summary: "In September 2026, GPT-6 Astra read a 217-year-old Napoleonic cipher from one scan. We downloaded the solution package and ran it offline: the key reproduces the literal text byte for byte, and 97% of the letters reach the final reading unchanged."
---

{{< theme-cover light="cover.jpg" dark="cover-dark.jpg" alt="A small robot with a magnifying glass studies a ciphered parchment next to a key and a grid of decoded signs" >}}

**In short:** In September 2026, engineer Carter Church used OpenAI's GPT-6 Astra to read a ciphered letter sent to General Marmont in 1809, from one scanned image, in about six hours of model time[^church]. We downloaded the published solution package and ran its scripts offline: the key reproduces the literal text byte for byte, and 97% of the letters reach the final reading unchanged[^package].

**Key takeaways:**

- The letter was written at the headquarters of Napoleon's stepson Eugène de Beauharnais on Napoleon's direct order of 16 March 1809; the ciphered text had never been read[^church][^correspondance].
- The cipher is a homophonic nomenclator: 155 signs, 1,300 cipher units, 29 signs for whole words. Only 33 values were published before[^church][^tant].
- The final text is computed, not composed: a script applies the key to every unit, then 29 documented editorial interventions turn the literal output into the reading[^package].
- Our independent run passed every check: 1,833 file hashes, byte-identical text, 1,800 images identical pixel for pixel[^package].
- The key anti-hallucination test — rerunning the solver without Napoleonic texts — is reported by the author but not included in the published package[^church][^package].

## What is a homophonic cipher?

A homophonic cipher (homophonic substitution cipher) replaces each plaintext letter with one of several interchangeable signs, so that frequent letters do not stand out[^homophonic]. In the Marmont letter, E and T each have nine signs. Counting sign frequencies, the classic first step of codebreaking, therefore reveals almost nothing.

The Marmont cipher is also a nomenclator (nomenclator cipher): some signs stand for whole words rather than letters. In this letter 29 signs encode words such as *de*, *que*, *les*, *vous* and *général*, two encode a doubled *s*, and several are nulls that mean nothing[^church]. A solver that assumes one sign equals one letter produces broken French wherever a word-sign appears.

## Was it really Napoleon's letter?

The letter was not written by Napoleon personally, but it carried out his direct order. It came from the headquarters of his stepson Eugène de Beauharnais, Viceroy of Italy[^euronews]. On 16 March 1809 Napoleon told Eugène to send General Auguste de Marmont the positions of every French and allied army, "in a ciphered letter and by an intelligent officer"[^correspondance].

Marmont held about 13,000 men in Dalmatia, cut off from every other French army by Austrian territory[^church]. Austria was about to go to war. The order itself has been in print since 1865[^correspondance]. What nobody had read was the ciphered letter that actually reached the general.

The letter survives only as a plate in J. Vilcoq's 1969 article in the *Revue historique des Armées*: one line of plain French, then 24 rows of cipher[^vilcoq]. The plate carries the wrong date, and the standard list of unsolved ciphers filed it under 1807[^cryptiana]. Church redated it to the last days of March 1809, about two weeks before Austria crossed the Inn on 10 April[^church].

The decrypted text is not a copy of the printed order. It adds where the Austrian corps stood, counts Marmont's own corps and the reserves, and fills a sentence that breaks off in the 1865 edition with a row of dots[^church][^correspondance].

## Why could nobody read the Marmont cipher for 217 years?

Five obstacles stacked on top of each other, and none of them alone was new to cryptanalysis[^church][^dhavare][^kopal].

| Obstacle | In numbers | Consequence |
| --- | --- | --- |
| Homophonic substitution | 115 signs for 25 letters | Frequency analysis fails |
| Nomenclator | 29 word-signs, 2 for doubled *s*, several nulls | Letter-only solvers break on word-signs |
| One poor source | One plate, about 19 px per sign, 175 hand-drawn marks to sort | The transcription is itself a hypothesis |
| Partial key | 33 published values covering 435 of 1,300 units | Two thirds of the text had to be recovered |
| No transcription | None existed; the last solver notes said "nothing to work on" | Work had to start from pixels |

Simulated annealing against homophonic ciphers is published, peer-reviewed work[^dhavare][^kopal]. Church himself writes that a patient specialist could have solved the letter in 1970, at the cost of weeks of combined work in period French, sign reading and statistics[^church]. Evidence indicates the barrier was cost, not impossibility.

What GPT-6 Astra changed is that transcription and cryptanalysis, usually separate skills and often separate careers, ran as one loop[^church].

## How did GPT-6 Astra decipher the letter?

GPT-6 Astra received one image and one goal and ran six stages in about six hours of execution time, according to the author[^church]. The image stayed in the loop to the end: every statistical guess was sent back to the pixels.

{{< figure-svg src="fig1-pipeline.svg" caption="The decipherment pipeline. Source: Church, 2026. Stage 6 is reported by the author." >}}

1. **Transcribe.** The plate was cut into row crops. Every visibly different mark got a provisional label, with possible pen variants kept apart. The final transcription has 1,310 units: 1,300 cipher units and 10 plain letters[^package].
2. **Pin what is known.** Daniel Tant's 33 published values were fixed as given[^tant]. The plain word CONSEQUENT in row 14 was kept as plaintext.
3. **Search the key.** A simulated annealing (a randomized search that accepts worse candidates early to escape dead ends) assigned letters to the remaining signs. Candidates were scored with French 3-, 4- and 5-gram statistics from Hugo, Dumas and Marmont's memoirs[^church].
4. **Promote word-signs.** Signs that kept breaking otherwise good French were retested as whole words[^church].
5. **Check against the plate.** A value that improved the French in one place was tested at every other occurrence of that sign. It was kept only if it worked everywhere[^church].
6. **Attack the result.** The solver was rerun from scratch under conditions designed to make it fail (see below)[^church].

## Is the decrypted text computed or written by the model?

The decrypted text is computed. A script applies the key to all 1,310 units in order and produces the literal text; no model is called during this step[^package]. The literal output is already readable French, with period spelling and a few wrong letters.

The final reading then applies 29 documented editorial interventions. Each is recorded with its row, character position, old and new text, and a reason[^package]:

- period spelling normalized: I→J, U→V, VV→W (AUIOURDHUI → AUJOURDHUI);
- elisions restored: DE ELITE → D'ELITE, QUE ILS → QU'ILS;
- single-letter repairs: HOMMET → HOMMES (the key keeps q = T), QUSTRE → QUATRE, TDERGANISENT → S'ORGANISENT;
- one contextual expansion: the unresolved sign TARGET is read as *Sa Majesté*.

{{< figure-svg src="fig2-evidence.svg" caption="Evidence behind the reading. Data: Church solution package v1.0.0; recomputed by the author, 4 October 2026." >}}

By our count the edits touch about 44 of 1,438 letter positions, about 3%. The package also grades every unit: 1,232 units are comparatively well supported, 54 rest on contextual or sparse evidence, and 14 are affected by defects on the plate[^package].

This separation is what makes the result auditable. A model's free text cannot be traced back to evidence. A key can: change one cell and you see exactly which words break.

## Did the solver try to break its own answer?

Yes, according to the author: the solver was rerun from scratch with Marmont's memoirs and every Napoleonic text removed from its scoring corpus, and it recovered the same reading[^church].

The test targets the reading's most dangerous weakness: it agrees with history too well. Napoleon's printed order lists the same seven forces, in the same sequence, with the same figures[^church][^correspondance]. A system that has read that order could produce a fluent "decryption" by remembering rather than decrypting. The better the match, the stronger the suspicion.

If the key had leaned on known history, removing that history should have made it drift or collapse. Church reports that it did not[^church].

The test has two limits. First, it cleans the n-gram corpus, not the weights of GPT-6 Astra, which almost certainly saw Napoleon's correspondence during training. That memory could still tilt the value chosen for a sign that appears only once — and 50 signs appear only once[^package].

Second, the ablation run is not in the published package v1.0.0. We searched every file: there is no corpus, solver log or report for it[^package]. The ablation is the author's claim, not yet independently verifiable.

The format contains the residual risk. Because the text is a function of key and transcription, a "hint" from model memory can act only through individual sign values, each checked against the plate and listed among the soft spots when evidence is thin[^package]. Content absent from every printed source, such as the Austrian positions, is a further signal that the key reads the cipher rather than the record[^church].

## What did our independent check show?

Our check confirmed that the published package is safe, internally consistent and fully reproducible offline. We ran it on 4 October 2026 in an isolated Linux environment on a Mac (Apple Silicon), with Python 3.10.12 and Pillow 12.3.0.

**Code review before running.** We read `verify.py`, `reproduce.py` and the core module before execution. The scripts use only the Python standard library and Pillow. They make no network requests, launch no other programs, and write only inside the package's own `results/` folder. The single script on the offline reading page is a search filter for the key table.

**Results.**

| Check | Result | Time |
| --- | --- | --- |
| File integrity (`verify.py`) | 1,833 files match the internal SHA-256 manifest | 2.1 s |
| Key × transcription → literal text | Byte-identical to the published `literal.txt` | — |
| Editorial layer | All 29 interventions replay exactly to the published reading | — |
| Image evidence | 155 glyphs and 1,310 unit crops match the source plate | — |
| Full rebuild (`reproduce.py`) | 1,800 images identical pixel for pixel; 6 text files byte-identical | 3.8 s |

*Data: author's run, 4 October 2026, n = 1 machine. Our results match the author's own validation record dated 19 September 2026[^package].*

**What we could not check.** We verified the unpacked files, not the original archive, so the published SHA-256 hash of the ZIP file was not compared. The plate in the package measures 1,051 × 1,246 px, while the write-up describes a 1,202 × 1,836 px plate; the package does not explain the difference[^church][^package]. The credits list "GPT-6 Astra and Claude" as AI assistance, not Astra alone[^package].

## What remains unproven?

The scripts prove reproducibility, not truth. The package states this itself: a passing check "does not establish unique decipherment or manuscript authentication"[^package].

- **Uniqueness.** Unknown. No one has shown that no other key produces equally good French.
- **Five open readings.** *Sa Majesté* or *l'Empereur*; "army of Friuli" or "in Friuli"; *des* or *les troupes*; a null or the word *par*; *canailles* singular or plural. None changes the meaning[^church].
- **Leakage from model memory.** Preliminary: the corpus ablation is reported but unpublished, and model weights cannot be ablated.
- **Independent review.** Satoshi Tomokiyo, who maintains the Cryptiana list of unsolved ciphers, reviewed the solution and marked it solved[^church][^cryptiana]. That is one expert, not a published peer review.

## What makes an AI decipherment claim trustworthy?

An AI decipherment is trustworthy when its output is an artifact a script can check, not prose a model wrote. The Marmont package meets most of the criteria below; the last open item is the ablation.

1. **Artifact, not prose.** Transcription, key and code are published, not just a plaintext. *Met*[^package].
2. **Deterministic output.** The key is applied to every unit by script. *Met, verified by us.*
3. **Separate editorial layer.** Every human repair is recorded and replayable. *Met, verified by us.*
4. **Per-sign evidence.** Each value is checked against every occurrence on the source image. *Met, verified by us.*
5. **Leakage ablation.** Known texts are removed from scoring and the solver is rerun. *Reported, not published.*
6. **Disclosed uncertainty.** Single-occurrence signs and alternative readings are listed. *Met*[^package].
7. **Independent review.** *One expert review*[^church].

Where the model's own memory cannot be removed, these steps confine it to individual, inspectable decisions. That is the difference between a plausible text and a verified one.

## Frequently asked questions

**How long did the decipherment take?** About six hours of GPT-6 Astra execution time, plus a few evenings of the author's own work, according to Church[^church].

**What does the letter say?** It lists the French and allied armies, places the Austrian corps at Laibach, Klagenfurt, Villach and Salzburg, and tells Marmont not to be intimidated by "a few troops or a gathering of rabble"[^church].

**Can I run the verification myself?** Yes. Download the package from Church's write-up, install Pillow and run `python3 verify.py`, then `python3 reproduce.py`; both work offline[^church][^package].

**Did Napoleon introduce the metric system?** No. The Revolution adopted it in 1795–1799. Napoleon kept it for the state and schools, but in 1812 allowed traditional unit names, redefined in metric terms, in retail trade; full metric use returned in 1840[^french-units].

**What else did Napoleon build that the letter relied on?** A centralized administration, the Civil Code of 1804, state lycées from 1802 with compulsory mathematics, and an extended Chappe optical telegraph reaching Milan, Venice and Amsterdam by 1810[^napoleon-org][^selin].

[^church]: Church, C. [Breaking the Marmont Cipher, 1809](https://carter.church/writeups/the-letter-to-marmont/). 18 September 2026.
[^package]: Church, C. [Marmont Solution Package v1.0.0](https://carter.church/writeups/the-letter-to-marmont/Marmont_Solution_v1.0.0.zip). 2026. Files used: `README.md`, `METHODS.md`, `CREDITS.md`, `VERIFICATION.json`, `inputs/editorial_interventions.tsv`, `verify.py`, `reproduce.py`.
[^vilcoq]: Vilcoq, J. [Le Chiffre sous le Premier Empire](https://www.persee.fr/doc/rharm_0035-3299_1969_num_25_4_8686). *Revue historique des Armées* 25(4), 1969, pp. 22–27.
[^tant]: Tant, D. [Code d'Eugène de Beauharnais](https://www.arcsi.fr/doc/Tant/373.pdf). Codes anciens no. 373, ARCSI.
[^cryptiana]: Tomokiyo, S. [Cryptiana: Unsolved Historical Ciphers](https://cryptiana.web.fc2.com/code/unsolved.htm).
[^correspondance]: [*Correspondance de Napoléon Ier*, vol. 18](https://archive.org/details/correspondancede18napouoft). Paris, 1865, no. 14908, pp. 356–358.
[^dhavare]: Dhavare, A., Low, R. M., Stamp, M. [Efficient Cryptanalysis of Homophonic Substitution Ciphers](http://www.cs.sjsu.edu/faculty/stamp/RUA/homophonic.pdf). *Cryptologia* 37(3), 2013, pp. 250–281.
[^kopal]: Kopal, N. [Cryptanalysis of Homophonic Substitution Ciphers Using Simulated Annealing with Fixed Temperature](https://ep.liu.se/en/conference-article.aspx?series=ecp&issue=158&Article_No=12). *Proceedings of HistoCrypt 2019*, pp. 107–116.
[^euronews]: Euronews. [AI decodes 217-year-old Napoleonic letter in 6 hours](https://www.euronews.com/2026/10/02/ai-decodes-217-year-old-napoleonic-letter-in-6-hours). 2 October 2026.
[^homophonic]: Wikipedia. [Substitution cipher: homophonic substitution](https://en.wikipedia.org/wiki/Substitution_cipher).
[^napoleon-org]: Fondation Napoléon. [The "masses of granite": the new Napoleonic institutions](https://www.napoleon.org/en/young-historians/napodoc/les-masses-de-granit-de-nouvelles-institutions-napoleoniennes/).
[^selin]: Selin, S. [Napoleonic Telecommunications: The Chappe Semaphore Telegraph](https://shannonselin.com/2020/05/chappe-semaphore-telegraph/). 2020.
[^french-units]: Wikipedia. [French units of measurement](https://en.wikipedia.org/wiki/French_units_of_measurement).
