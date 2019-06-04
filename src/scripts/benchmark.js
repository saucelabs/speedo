/**
 * Computes a memory/CPU performance benchmark index to determine rough device class.
 * @see https://docs.google.com/spreadsheets/d/1E0gZwKsxegudkjJl8Fki_sOwHKpqgXwt8aBAfuUaB8A/edit?usp=sharing
 *
 * The benchmark creates a string of length 100,000 in a loop.
 * The returned index is the number of times per second the string can be created.
 *
 *  - 750+ is a desktop-class device, Core i3 PC, iPhone X, etc
 *  - 300+ is a high-end Android phone, Galaxy S8, low-end Chromebook, etc
 *  - 75+ is a mid-tier Android phone, Nexus 5X, etc
 *  - <75 is a budget Android phone, Alcatel Ideal, Galaxy J2, etc
 */
export default function ultradumbBenchmarkScript () {
    const start = Date.now()
    let iterations = 0

    while (Date.now() - start < 500) {
        let s = '' // eslint-disable-line no-unused-vars
        for (let j = 0; j < 100000; j++) s += 'a'

        iterations++
    }

    const durationInSeconds = (Date.now() - start) / 1000
    return Math.round(iterations / durationInSeconds)
}
