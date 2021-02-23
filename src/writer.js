class Writer {
  constructor(name, streamName, date) {
    this.name = name;
    this.streamName = streamName;
    this.date = date;

    this.destination = '/' + this.date.toISOString().split('T')[0] + '/' + this.streamName;
  }
}

module.exports = Writer;