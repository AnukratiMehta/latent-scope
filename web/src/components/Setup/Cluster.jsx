// NewEmbedding.jsx
import { useState, useEffect, useCallback} from 'react';
import JobProgress from '../Job/Progress';
import { useStartJobPolling } from '../Job/Run';
const apiUrl = import.meta.env.VITE_API_URL

// import styles from './Cluster.module.css';

import PropTypes from 'prop-types';
Cluster.propTypes = {
  dataset: PropTypes.shape({
    id: PropTypes.string.isRequired
  }).isRequired,
  cluster: PropTypes.object,
  umap: PropTypes.object,
  clusters: PropTypes.array,
  onNew: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

// This component is responsible for the embeddings state
// New embeddings update the list
function Cluster({ dataset, cluster, umap, onNew, onChange}) {
  const [clusterJob, setClusterJob] = useState(null);
  const { startJob: startClusterJob } = useStartJobPolling(dataset, setClusterJob, `${apiUrl}/jobs/cluster`);
  const { startJob: deleteClusterJob } = useStartJobPolling(dataset, setClusterJob, `${apiUrl}/jobs/delete/cluster`);

  const [clusters, setClusters] = useState([]);

  function fetchClusters(datasetId, callback) {
    fetch(`${apiUrl}/datasets/${datasetId}/clusters`)
      .then(response => response.json())
      .then(data => {
        const array = data.map(d => {
          return {
            ...d,
            url: `${apiUrl}/files/${datasetId}/clusters/${d.id}.png`,
          }
        })
        // console.log("clusters", clusters)
        callback(array.reverse())
      });
  }
  
  useEffect(() => {
    fetchClusters(dataset.id, (clstrs) => {
      setClusters(clstrs)
      onNew(clstrs)
    })
  }, [dataset, onNew]);

  useEffect(() => {
    if(clusterJob?.status == "completed") {
      fetchClusters(dataset.id, (clstrs) => {
        setClusters(clstrs)
        let cls;
        if(clusterJob.job_name == "cluster"){
          cls = clstrs.find(d => d.id == clusterJob.run_id)
        } else if(clusterJob.job_name == "rm") {
          cls = clstrs[0]
        }
        onNew(clstrs, cls)
      })
    }
  }, [clusterJob, dataset, setClusters, onNew]);

  const handleNewCluster = useCallback((e) => {
    e.preventDefault()
    const form = e.target
    const data = new FormData(form)
    const samples = data.get('samples')
    const min_samples = data.get('min_samples')
    startClusterJob({umap_id: umap.id, samples, min_samples})
  }, [startClusterJob, umap])


  return (
    <div className="dataset--clusters-new">
      <form onSubmit={(e) => handleNewCluster(e, umap)}>
        <label>
          Samples:
          <input type="number" name="samples" defaultValue={dataset.length < 1000 ? 5 : 25} disabled={!!clusterJob || !umap}/>
        </label>
        <label>
          Min Samples:
          <input type="number" name="min_samples" defaultValue="5" disabled={!!clusterJob || !umap} />
        </label>
        <button type="submit" disabled={!!clusterJob || !umap}>New Clusters</button>
      </form> 

      <JobProgress job={clusterJob} clearJob={()=>setClusterJob(null)} />

      <div className="dataset--setup-clusters-list">
        {umap && clusters.filter(d => d.umap_id == umap.id).map((cl, index) => (
          <div className="item dataset--setup-clusters-item" key={index}>
            <input type="radio" 
              id={`cluster${index}`} 
              name="cluster" 
              value={cluster} 
              checked={cl.id === cluster?.id} 
              onChange={() => onChange(cl)} />
            <label htmlFor={`cluster${index}`}>{cl.id}
            <br></br>
              Clusters: {cl.n_clusters}<br/>
              Noise points: {cl.n_noise}<br/>
              Samples: {cl.samples}<br/>
              Min Samples: {cl.min_samples}<br/>
            <img src={cl.url} alt={cl.id} /><br/>
            <button onClick={() => deleteClusterJob({cluster_id: cl.id}) }>🗑️</button>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cluster;