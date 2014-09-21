function BerlinMap(width, height) {
    var self = this;
    this.snap = new Snap(width, height);

    function createDrawMode(lineClass) {
        return function (event) {
            var nLine = new Line(self.snap, lineClass, event.x, event.y).ss(0);
            var start = nLine.endCoords();

            const drawLine = function (event) {
                var dx = event.x - start.x;
                var dy = event.y - start.y;
                nLine.lastSegment().length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                nLine.lastSegment().setDirection(Snap.snapTo(45, Snap.angle(0, 0, dx, dy), 22.5));
                nLine._draw();
            };

            const corner = function (event) {
                start = nLine.endCoords();
                nLine.ne(1);
            };

            const endLine = function () {
                self.snap.unmousemove(drawLine);
                self.snap.unclick(corner);
                self.snap.undblclick(endLine);
                drawMode = createDrawMode('s2');
                self.snap.click(drawMode);
                nLine._segments.pop(); // last segment will be junk
                nLine._segments.pop(); // last segment will be junk
                nLine._draw();
            };

            self.snap.mousemove(drawLine);
            self.snap.unclick(drawMode);
            self.snap.click(corner);
            self.snap.dblclick(endLine)
        };
    }

    var drawMode = createDrawMode('s8');
    self.snap.click(drawMode);
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

BerlinMap.prototype.line = function(lineClass, startX, startY) {
    return new Line(this.snap, lineClass, startX, startY);
};

function Line(snap, lineClass, startX, startY) {
    this.snap = snap;
    this._start = [startX, startY];
    this._segments = [];
    this._line = this.snap.path(this._d()).attr({
        "class": "line " + lineClass
    });
}



var unsignedDiff = function(a, b) {
    if (a > 0) {
        return a - Math.abs(b);
    } else {
        return a + Math.abs(b);
    }
};

Line.prototype._appendStraight = function(dir, length) {
    this._segments.push(new LineSegment(dir, length));
};

Line.prototype._d = function() {
    var d = 'M ' + this._start[0] + ' ' + this._start[1] + ' ';
    var previousSegment = null;

    function appendPrevious(seg, nextSegment) {
        if (!nextSegment) {
            d += 'l ' + seg.xStraight() + ' ' + seg.yStraight() + ' ';
            return null;
        } else {
            d += 'l ' + seg.xStraightBeforeTurn() + ' ' + seg.yStraightBeforeTurn() + ' ';
            var sweep = turnsClockwise(nextSegment.dirAngle(), seg.dirAngle()) << 0;
            var radius = seg.tCornerRadius;
            d += "a " + radius + " " + radius + " 0 0 " + sweep + " " + seg.xArcDistance(nextSegment) + " " + seg.yArcDistance(nextSegment) + " ";
            return nextSegment.shortenAfterArc(seg);
        }
    }

    this._segments.forEach(function(seg) {
        if (previousSegment) {
            previousSegment = appendPrevious(previousSegment, seg);
        } else {
            previousSegment = seg;
        }
    });
    if (previousSegment) {
        appendPrevious(previousSegment);
    }
    return d;
};

Line.prototype._straight = function(dir, length) {
    this._appendStraight(dir, length);
    this._draw();
};

Line.prototype._draw = function() {
    this._line.attr({d: this._d()});
};

const r_2 = Math.sqrt(2);

Line.prototype.se = function(length) {
    this._straight('se', r_2 * length);
    return this;
};

Line.prototype.ss = function(length) {
    this._straight('s', length);
    return this;
};

Line.prototype.ee = function(length) {
    this._straight('e', length);
    return this;
};

Line.prototype.sw = function(length) {
    this._straight('sw', r_2 * length);
    return this;
};

Line.prototype.nw = function(length) {
    this._straight('nw', r_2 * length);
    return this;
};

Line.prototype.ne = function(length) {
    this._straight('ne', r_2 * length);
    return this;
};

Line.prototype.lastSegment = function () {
    return this._segments[this._segments.length - 1];
};

Line.prototype.turn = function(radius) {
    this.lastSegment().tCornerRadius = radius;
    return this;
};

Line.prototype.endCoords = function() {
    return this._line.getPointAtLength(this._line.getTotalLength());
};

function LineSegment(direction, length, tCornerRadius) {
    this.direction = direction;
    this.length = length;
    this.tCornerRadius = tCornerRadius || 8;
    if (!this.direction)
        throw this.direction;
}

LineSegment.prototype.xStraight = function() {
    var x = 0;
    if (this.direction.indexOf('e') >= 0) {
        x = this.length;
    }
    if (this.direction.indexOf('w') >= 0) {
        x = -this.length;
    }
    if (this.direction.indexOf('n') >= 0 || this.direction.indexOf('s') >= 0) {
        x /= r_2;
    }
    return x;
};

LineSegment.prototype.yStraight = function() {
    var y = 0;
    if (this.direction.indexOf('s') >= 0) {
        y = this.length;
    }
    if (this.direction.indexOf('n') >= 0) {
        y = -this.length;
    }
    if (this.direction.indexOf('e') >= 0 || this.direction.indexOf('w') >= 0) {
        y /= r_2;
    }
    return y;
};

LineSegment.prototype.dirAngle = function() {
    return Math.atan2(this.xStraight(), this.yStraight());
};

LineSegment.prototype.xStraightBeforeTurn = function() {
    var dx1 = this.tCornerRadius * Math.cos(this.dirAngle());    // as we only go at 45 degree angles, these 2 should either be the same or one of them 0
    if (this.xStraight() != 0) {
        return unsignedDiff(this.xStraight(), dx1);
    } else {
        return 0;
    }
};

LineSegment.prototype.yStraightBeforeTurn = function() {
    var dy1 = this.tCornerRadius * Math.sin(this.dirAngle());    // that's happening for most, but not all
    if (this.yStraight() != 0) {
        return unsignedDiff(this.yStraight(), dy1);
    } else {
        return 0;
    }
};

function turnsClockwise(angle1, angle2, flip180) {
    const difference = angle2 - angle1;
    return difference <= - Math.PI || difference >= 0 && difference < Math.PI;
}
LineSegment.prototype.xArcDistance = function(nextSegment) {
    if (turnsClockwise(this.dirAngle(), nextSegment.dirAngle())) {
        return this.tCornerRadius *
            (Math.cos(this.dirAngle()) - Math.cos(nextSegment.dirAngle()));
    } else {
        return this.tCornerRadius *
            -(Math.cos(this.dirAngle()) - Math.cos(nextSegment.dirAngle()));
    }
};

LineSegment.prototype.yArcDistance = function(nextSegment) {
    if (turnsClockwise(this.dirAngle(), nextSegment.dirAngle())) {
        return this.tCornerRadius *
            -(Math.sin(this.dirAngle()) - Math.sin(nextSegment.dirAngle()));
    } else {
        return this.tCornerRadius *
            (Math.sin(this.dirAngle()) - Math.sin(nextSegment.dirAngle()));
    }
};

LineSegment.prototype.shortenAfterArc = function(previousSegment) {
    var radius = previousSegment.tCornerRadius;
    var newDir = this.dirAngle();
    var dx2 = radius * Math.cos(newDir);
    var dy2 = radius * Math.sin(newDir);
    const shortening = r_2 * Math.max(Math.abs(dx2), Math.abs(dy2)); // this only works as we only go at 45 degree angles
    return new LineSegment(this.direction, this.length - shortening, this.tCornerRadius);
};

LineSegment.prototype.setDirection = function(dir) {
    this.direction = _convertDirection(dir);
    if (!this.direction)
        throw dir;
};

function _convertDirection(dir) {
    switch(dir) {
        case 45: return 'nw';
        case 90: return 'n';
        case 135: return 'ne';
        case 180: return 'e';
        case 225: return 'se';
        case 270: return 's';
        case 315: return 'sw';
        case 0:
        case 360: return 'w';
    }
}

function Station(cx, cy, angle, length, width, path) {

}