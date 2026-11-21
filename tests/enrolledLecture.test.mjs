import assert from "node:assert/strict";
import { test } from "node:test";
import { enrolledLecture } from "../src/utils/enrolledLecture.mjs";

const course = {
  tree: { "08128": ["08144"], "08185": ["08193"] },
  sections: {
    "08144": { periods: [{ time: "R 14:00 - 14:50", location: "PHELP 3525" }] },
    "08193": { periods: [{ time: "F 09:00 - 09:50", location: "PHELP 3525" }] },
  },
};

test("matches a lecture directly or through its enrolled discussion", () => {
  assert.equal(enrolledLecture(course, [{ sectionCode: "08185" }]), "08185");
  assert.equal(enrolledLecture(course, [{ sectionCode: "08144" }]), "08128");
  assert.equal(enrolledLecture(course, [{
    sectionCode: "0101", time: "R 14:00-14:50", location: "PHELP 3525",
  }]), "08128");
});

test("requires a unique lecture when multiple lectures are offered", () => {
  assert.equal(enrolledLecture(course, [{ sectionCode: "0101" }]), undefined);
  assert.equal(enrolledLecture(course, [{ sectionCode: "08144" }, { sectionCode: "08193" }]), undefined);
  assert.equal(enrolledLecture({ tree: { "08128": [] } }), "08128");
});
