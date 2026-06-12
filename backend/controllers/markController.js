const Mark = require('../models/Mark');
const Subject = require('../models/Subject');
const User = require('../models/User');

exports.getMyMarks = async (req, res) => {
  try {
    const marks = await Mark.find({ student: req.user.id }).populate('subject', 'name code');
    res.status(200).json({ success: true, marks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.enterMarks = async (req, res) => {
  try {
    const { studentId, subjectId, internal, external } = req.body;
    
    // validate if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    
    // validate if student exists
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    let mark = await Mark.findOne({ student: studentId, subject: subjectId });
    const total = (Number(internal) || 0) + (Number(external) || 0);

    if (mark) {
      if (mark.locked && req.user.role !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Marks are locked and cannot be edited directly. Please raise an approval request.' });
      }
      mark.internal = internal !== undefined ? internal : mark.internal;
      mark.external = external !== undefined ? external : mark.external;
      mark.total = total;
      mark.updatedBy = req.user.id;
      await mark.save();
    } else {
      mark = await Mark.create({
        student: studentId,
        subject: subjectId,
        internal: internal || 0,
        external: external || 0,
        total,
        updatedBy: req.user.id
      });
    }

    res.status(200).json({ success: true, message: 'Marks saved successfully', mark });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.lockMarks = async (req, res) => {
  try {
    const { subjectId } = req.body;
    
    // Update all marks for this subject to be locked
    const result = await Mark.updateMany(
      { subject: subjectId },
      { $set: { locked: true } }
    );
    
    res.status(200).json({ success: true, message: 'Marks locked successfully', matchedCount: result.matchedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMarksBySubject = async (req, res) => {
  try {
    const marks = await Mark.find({ subject: req.params.subjectId }).populate('student', 'name email');
    res.status(200).json({ success: true, marks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
