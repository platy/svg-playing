function BerlinMap(width, height) {
    this.snap = new Snap(width, height);
}

BerlinMap.prototype.station = function(cx, cy, angle, length, width) {
    switch (length) {
        case 2:
            length = 16;
            break;
        case 3:
            length = 20;
            break;
        case 4:
            length = 30;
            break;
    }
    var stationPath = this.snap.path("M -" + length / 2 + " -4 h " + length + " a 4 4 0 0 1 0 8 h -" + length + " a 4 4 0 0 1 0 -8")
        .attr({stroke: "black", fill: "white"})
        .transform("translate("+cx+", "+cy+") rotate("+angle+")");
    return new Station(cx, cy, angle, length, width, stationPath);
};

BerlinMap.prototype.line = function(startX, startY) {
    return new LineStub(this.snap, startX, startY);
};

BerlinMap.prototype.connect = function(startX, startY) {
    return new ConnectStub(this.line(startX, startY));
};

function ConnectStub(line) {
    this.line = line;
    this.lastX = line.startX;
    this.lastY = line.startY;
}

ConnectStub.prototype.connect = function (x, y) {
    this.line._straight(this._dx(x), this._dy(y));
    this.lastX = x;
    this.lastY = y;
    return this;
};

ConnectStub.prototype._dx = function (x) {
    return x - this.lastX;
};

ConnectStub.prototype._dy = function (y) {
    return y - this.lastY;
};

ConnectStub.prototype.draw = function (lineClass) {
    return this.line.draw(lineClass);
};

function LineStub(snap, startX, startY) {
    this.snap = snap;
    this.startX = startX;
    this.startY = startY;
    this.d = "M " + startX + " " + startY + " ";
    this._pendingTurn = null;
    this._pendingStraight = null;
}

LineStub.prototype._dir = function (dx, dy) {
    return Math.atan2(dx, dy);
};

var unsignedDiff = function(a, b) {
    if (a > 0) {
        return a - Math.abs(b);
    } else {
        return a + Math.abs(b);
    }
};

LineStub.prototype._appendPending = function(newDir) {
    if (this._pendingStraight != null) {
        var radius = this._pendingTurn;
        var ox = this._pendingStraight[0];
        var oy = this._pendingStraight[1];
        if (radius == null)
            this._appendStraight(ox, oy);
        else {
            var oldDir = this._dir(ox, oy);
            var dx1 = radius * Math.cos(oldDir);
            var dy1 = radius * Math.sin(oldDir);
            var dx2 = radius * Math.cos(newDir);
            var dy2 = radius * Math.sin(newDir);
            var sweep = (newDir - oldDir < 0) << 0;
            this._appendStraight(unsignedDiff(ox, dx1), unsignedDiff(oy, dy1));
            this.d += "a " + radius + " " + radius + " 0 0 " + sweep + " " + (dx1 - dx2) + " " + Math.abs(dy1 - dy2) + " ";
            this._pendingStraight = []
        }
        this._pendingStraight = null;
        this._pendingTurn = null;
    }
};

LineStub.prototype._appendStraight = function(dx, dy) {
    this.d += "l " + dx + " " + dy + " ";
};

LineStub.prototype._straight = function(dx, dy) {
    var newDir = this._dir(dx, dy);
    var radius = this._pendingTurn;
    this._appendPending(newDir);
    var dy2 = radius * Math.cos(newDir);
    var dx2 = radius * Math.sin(newDir);
    this._pendingStraight = [unsignedDiff(dx, dx2), unsignedDiff(dy, dy2)];
};

LineStub.prototype.se = function(length) {
    this._straight(length, length);
    return this;
};

LineStub.prototype.ss = function(length) {
    this._straight(0, length);
    return this;
};

LineStub.prototype.ee = function(length) {
    this._straight(length, 0);
    return this;
};

LineStub.prototype.sw = function(length) {
    this._straight(-length, length);
    return this;
};

LineStub.prototype.nw = function(length) {
    this._straight(-length, -length);
    return this;
};

LineStub.prototype.ne = function(length) {
    this._straight(length, -length);
    return this;
};

LineStub.prototype.turn = function(radius) {
    if (this._pendingTurn !== null)
        throw "2 turns in a row";
    this._pendingTurn = radius;
    return this;
};

LineStub.prototype.draw = function(lineClass) {
    this._appendPending();
    this.snap.path(this.d).attr({
        "class": "line " + lineClass
    });
};

function Station(cx, cy, angle, length, width, path) {

}