import { contentVideoRepoContract } from "./repoContract";
import { memoryContentVideoRepo } from "./repo.memory";

contentVideoRepoContract(async (blocks) => memoryContentVideoRepo(blocks));
