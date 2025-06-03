"use client"
import { useState, useEffect } from 'react';
import {supabase} from '../app/supabaseClient';
import { toast, ToastContainer } from 'react-toastify'

export default function Home() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterOption, setFilterOption] = useState<string>('all');
  const [recordCounts, setCount] = useState<number | null>(0);
  
  const limit = 10;

  const [editStates, setEditStates] = useState<{ [key: number]: any }>({});

  const fetchProfiles = async (pageNum: number, filter: string = 'all') => {
  setLoading(true);
  try {
    
      let query = supabase.from('profiled').select('*', { count: 'exact', head: true });
      
      if (filter === 'Processing') query = query.eq('Status', 1);
      else if (filter === 'Errored') query = query.eq('Status', 2);
      else if (filter === 'Partial') query = query.eq('Status', 3);
      else if (filter === 'Completed') query = query.eq('Status', 4);


      const { count, error: countError } = await query;
      if (countError) throw countError;

      setCount(count)

      const total = count || 0;
      setTotalPages(Math.ceil(total / limit));

      const from = (pageNum - 1) * limit;
      const to = from + limit - 1;

      let dataQuery = supabase
      .from('profiled')
      .select(`*, profiledtags(tagid, tags(tag))`)
      .range(from, to)
      .order('id', { ascending: true });

      if (filter === 'Processing') dataQuery = dataQuery.eq('Status', 1);
      else if (filter === 'Errored') dataQuery = dataQuery.eq('Status', 2);
      else if (filter === 'Partial') dataQuery = dataQuery.eq('Status', 3);
      else if (filter === 'Completed') dataQuery = dataQuery.eq('Status', 4);

      const { data, error } = await dataQuery;

      if (error) throw error;

      const transformedData = data.map((profile: any) => ({
        ...profile,
        tags: profile.profiledtags?.map((pt: any) => pt.tags?.tag) || [],
      }));

      setProfiles(transformedData);
      setEditStates({});
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles(page, filterOption);
  }, [page, filterOption]);

  const startEdit = (id: number) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    setEditStates((prev) => ({
      ...prev,
      [id]: { title: profile.title, name: profile.name, description: profile.description,
         tags: profile.tags || []
       },
    }));
  };

  const cancelEdit = (id: number) => {
    setEditStates((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

const handleChange = (
  id: number,
  field: string,
  value: string | string[]
) => {
  setEditStates((prev) => ({
    ...prev,
    [id]: {
      ...prev[id],
      [field]: value,
    },
  }));
};

  const saveProfile = async (id: number, status:number) => {
    if (!editStates[id]) return;

    setLoading(true);
    try {
      const updatedData = editStates[id];

      const { error: updateError } = await supabase
        .from('profiled')
        .update({
          title: updatedData.title,
          name: updatedData.name,
          description: updatedData.description,
          Status:status
        })
        .eq('id', id);

      if (updateError) throw updateError;

      if (Array.isArray(updatedData.tags)) {
        await supabase.from('profiledtags').delete().eq('profileid', id);

        const tagInsertions = await Promise.all(
          updatedData.tags.map(async (tagName: string) => {
            const { data: existingTags } = await supabase
              .from('tags')
              .select('id')
              .eq('tag', tagName)
              .single();

            if (existingTags) return existingTags.id;

            const { data: newTag } = await supabase
              .from('tags')
              .insert({ tag: tagName })
              .select()
              .single();

            return newTag.id;
          })
        );

        const tagLinks = tagInsertions.map((tagId) => ({
          profileid: id,
          tagid: tagId,
        }));

        await supabase.from('profiledtags').insert(tagLinks);
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...updatedData, tags: updatedData.tags || [] } : p
        )
      );

      cancelEdit(id);
      toast.success('Profile updated..');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-black italic text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="mb-4">
         <select title='filter'
            id="filter"
            value={filterOption}
            onChange={(e) => {
              setFilterOption(e.target.value);
              fetchProfiles(1, e.target.value);
            }}
               className="block w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

          >
          <option value="all">All</option>
          <option value="Processing">Processing</option>
          <option value="Errored">Errored</option>
          <option value="Partial">Partial</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      {!loading ? (
          <span className='text-black'>
            {filterOption == 'all' ? (
              <div>
                Total {recordCounts} Records Found 
              </div>
            ):(
              <div>
                Total {recordCounts} - {filterOption} Records Found
              </div>
            )}
          </span>
        ):null }
      {loading ? (
        <p className="text-center text-black">Loading...</p>
      ) : profiles.length === 0 ? (
        <p className="text-center text-black italic">No profiles found.</p>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto p-2 border border-gray-300 rounded shadow-sm bg-white">
          {profiles.map((profile) => {
            const isEditing = !!editStates[profile.id];
            return (
              <div
                key={profile.id}
                className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 bg-gray-50"
              >
                <p className="text-sm text-gray-600">
                  Profile Id: <span className="text-black">{profile.id} </span>
                  <a className='text-blue-600 hover:underline' href={profile.url} target='_blank'>/ {profile.url}</a> 
                </p>

                {isEditing ? (
                  <>
                    <label className='text-black'>Title</label>
                    <input
                      type="text"
                      value={editStates[profile.id]?.title ?? ''}
                      onChange={(e) => handleChange(profile.id, 'title', e.target.value)}
                      className="text-black w-full mt-1 p-2 border rounded-md"
                      placeholder="Title"
                    />
                    <label className='text-black'>Name</label>
                    <input
                      type="text"
                      value={editStates[profile.id]?.name ?? ''}
                      onChange={(e) => handleChange(profile.id, 'name', e.target.value)}
                      className="text-black w-full mt-2 p-2 border rounded-md"
                      placeholder="Name"
                    />
                    <label className='text-black'>Description</label>
                    <textarea
                      value={editStates[profile.id]?.description ?? ''}
                      onChange={(e) => handleChange(profile.id, 'description', e.target.value)}
                      className="text-black w-full mt-2 p-2 border rounded-md resize-none"
                      rows={3}
                      placeholder="Description"
                    />

                  <label className="text-black mt-2">Tags</label>
                  <div className="flex flex-wrap items-center gap-2 mt-1 border p-2 rounded-md bg-white">
                    {editStates[profile.id]?.tags?.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = editStates[profile.id].tags.filter((_:any, i:number) => i !== idx);
                            handleChange(profile.id, 'tags', newTags);
                          }}
                          className="ml-1 text-red-500 hover:text-red-700 font-bold"
                        >
                          &times;
                        </button>
                      </span>
                    ))}

                    <input
                      type="text"
                      value={editStates[profile.id]?.tagInput ?? ''}
                      onChange={(e) =>
                        handleChange(profile.id, 'tagInput', e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const input = (editStates[profile.id]?.tagInput ?? '').trim();
                          if (input) {
                            const existingTags = editStates[profile.id]?.tags ?? [];
                            if (!existingTags.includes(input)) {
                              handleChange(profile.id, 'tags', [...existingTags, input]);
                            }
                            handleChange(profile.id, 'tagInput', '');
                          }
                        }
                      }}
                      placeholder="Type a tag and press Enter"
                      className="flex-1 min-w-[150px] text-black p-1 border-none outline-none"
                    />
                  </div>

                    <div className="mt-3 flex space-x-3">
                      <span className='text-black'>Save As : </span>
                      <button type="button" onClick={() => saveProfile(profile.id, 1)} className="focus:outline-none text-black bg-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:focus:ring-yellow-900">Processing</button>
                      <button type="button" onClick={() => saveProfile(profile.id, 2)} className="focus:outline-none text-black bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">Errored</button>
                      <button type="button" onClick={() => saveProfile(profile.id, 3)} className="focus:outline-none text-black bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900">Partial</button>                        
                      <button type="button" onClick={() => saveProfile(profile.id, 4)} className="focus:outline-none text-black bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">Completed</button>

                      <button
                        onClick={() => cancelEdit(profile.id)}
                        className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-black mt-1">{profile.title}</p>
                    <p className="text-md text-black mt-1">{profile.name}</p>
                    <p className="text-gray-700 mt-2 line-clamp-3">{profile.description}</p>
                    {profile.tags && profile.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile.tags.map((tag:any, idx:number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ):(<div>
                        <p className="text-sm text-gray-600">
                          No Tags Founds.. 
                        </p>
                    </div>)}
                    <button
                      onClick={() => startEdit(profile.id)}
                      className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-between items-center">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className={`px-4 py-2 rounded-lg text-white font-semibold ${
            page === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } transition-colors duration-300`}
        >
          Previous
        </button>

        <span className="text-gray-700 font-medium">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className={`px-4 py-2 rounded-lg text-white font-semibold ${
            page === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } transition-colors duration-300`}
        >
          Next
        </button>
      </div>
      <ToastContainer />
    </div>
    
  );
}
