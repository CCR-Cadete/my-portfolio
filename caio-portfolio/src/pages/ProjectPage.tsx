import { useNavigate, useParams } from 'react-router-dom'
import OmniControlPanel from '../components/OmniControlPanel'
import DepthPanel from '../components/DepthPanel'
import NexusPanel from '../components/NexusPanel'
import KinesisPanel from '../components/KinesisPanel'


export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const onClose = () => navigate('/')
  const onProjectClick = (id: string) => navigate(`/${id}`)

  if (slug === 'omnicontrol') {
    return <OmniControlPanel open onClose={onClose} onProjectClick={onProjectClick} />
  }
  if (slug === 'depth') {
    return <DepthPanel open onClose={onClose} onProjectClick={onProjectClick} />
  }
  if (slug === 'nexus') {
    return <NexusPanel open onClose={onClose} onProjectClick={onProjectClick} />
  }
  if (slug === 'kinesis') {
    return <KinesisPanel open onClose={onClose} onProjectClick={onProjectClick} />
  }

  // Unknown slug — redirect home
  navigate('/', { replace: true })
  return null
}
