import resourceRepository from '../repositories/resource.repository.js';
import { toLimitOffset, buildMeta } from '../utils/pagination.js';
import ApiError from '../utils/ApiError.js';

/**
 * Resource business logic + serialization. Turns the flat joined repository row
 * into the nested shape the frontend consumes (type + subject/domain/university
 * OR skill OR exam), mirroring the old client-side transformResources().
 */
export function serialize(row) {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    topic: row.topic,
    isApproved: row.is_approved,
    dateAdded: row.created_at,
  };

  if (row.subject_id) {
    return {
      ...base,
      type: 'university',
      subject: { id: row.subject_id, name: row.subject_name },
      domain: row.domain_id ? { id: row.domain_id, name: row.domain_name } : null,
      university: row.university_id ? { id: row.university_id, name: row.university_name } : null,
    };
  }
  if (row.skill_id) {
    return {
      ...base,
      type: 'skill',
      skill: { id: row.skill_id, name: row.skill_name },
      skillCategory: row.skill_category_name ?? null,
    };
  }
  if (row.exam_id) {
    return {
      ...base,
      type: 'competitive',
      exam: { id: row.exam_id, name: row.exam_name },
      examCategory: row.exam_category_name ?? null,
    };
  }
  return { ...base, type: 'general' };
}

const serializeMany = (rows) => rows.map(serialize);

export async function listApproved(queryParams = {}) {
  const { limit, offset, page } = toLimitOffset(queryParams);
  const filters = {
    universityId: queryParams.universityId,
    domainId: queryParams.domainId,
    subjectId: queryParams.subjectId,
    skillId: queryParams.skillId,
    examId: queryParams.examId,
    type: queryParams.type,
  };
  const { rows, total } = await resourceRepository.list({ filters, limit, offset });
  return { data: serializeMany(rows), meta: buildMeta({ page, limit, total }) };
}

export async function getApprovedById(id) {
  const row = await resourceRepository.getById(id);
  if (!row || !row.is_approved) throw ApiError.notFound('Resource not found');
  return serialize(row);
}

export async function search({ q, limit }) {
  const rows = await resourceRepository.search({ q, limit });
  return serializeMany(rows);
}

/** Student submission — always created pending. */
export async function submit(data, userId) {
  ensureExactlyOneParent(data);
  const row = await resourceRepository.create({ ...data, submittedBy: userId, isApproved: false });
  return serialize(row);
}

/** Management create — may be auto-approved. */
export async function adminCreate(data, userId) {
  ensureExactlyOneParent(data);
  const row = await resourceRepository.create({
    ...data,
    submittedBy: userId,
    isApproved: data.isApproved ?? true,
  });
  return serialize(row);
}

export async function adminUpdate(id, data) {
  const row = await resourceRepository.update(id, data);
  return serialize(row);
}

export async function setApproval(id, isApproved, approverId) {
  const row = await resourceRepository.setApproval(id, { isApproved, approvedBy: approverId });
  return serialize(row);
}

export async function remove(id) {
  await resourceRepository.remove(id);
}

export async function listPending(queryParams = {}) {
  const { limit, offset, page } = toLimitOffset(queryParams);
  const { rows, total } = await resourceRepository.listPending({ limit, offset });
  return { data: serializeMany(rows), meta: buildMeta({ page, limit, total }) };
}

export async function listMySubmissions(userId) {
  const rows = await resourceRepository.listBySubmitter(userId);
  return serializeMany(rows);
}

/** Guard the "exactly one of subject/skill/exam" rule before hitting the DB. */
function ensureExactlyOneParent({ subjectId, skillId, examId }) {
  const provided = [subjectId, skillId, examId].filter(Boolean).length;
  if (provided !== 1) {
    throw ApiError.badRequest('Provide exactly one of subjectId, skillId or examId');
  }
}

export default {
  serialize,
  listApproved,
  getApprovedById,
  search,
  submit,
  adminCreate,
  adminUpdate,
  setApproval,
  remove,
  listPending,
  listMySubmissions,
};
